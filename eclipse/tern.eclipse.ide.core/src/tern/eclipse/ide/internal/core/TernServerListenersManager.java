/*
 * Copyright 2015, Genuitec, LLC
 * All Rights Reserved.
 */
package tern.eclipse.ide.internal.core;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import org.eclipse.core.runtime.CoreException;
import org.eclipse.core.runtime.IConfigurationElement;
import org.eclipse.core.runtime.IExtensionPoint;
import org.eclipse.core.runtime.Platform;

import com.genuitec.eclipse.core.GenuitecCoreException;
import com.genuitec.eclipse.core.util.InitException;

import tern.eclipse.ide.core.TernCorePlugin;
import tern.server.ITernServerListener;

public class TernServerListenersManager {

	private static final String EXT_SERVER_LISTENERS = "ternServerListeners"; //$NON-NLS-1$
	
	private static final String EL_LISTENER = "listener"; //$NON-NLS-1$
	
	private static final String ATTR_CLASS = "class"; //$NON-NLS-1$
	
	private static List<ITernServerListener> listeners;
	
	static {
		listeners = new ArrayList<ITernServerListener>();
		
		IExtensionPoint extensionPoint = Platform.getExtensionRegistry().getExtensionPoint(
				TernCorePlugin.PLUGIN_ID, EXT_SERVER_LISTENERS);
		
		IConfigurationElement[] elements = extensionPoint.getConfigurationElements();
		
		for (IConfigurationElement ce: elements) {
			if (ce.getName().equals(EL_LISTENER)) {
				loadListener(ce); 
			}
		}
		
		listeners = Collections.unmodifiableList(listeners);
	}
	
	private static void loadListener(IConfigurationElement element) {
		String cls = element.getAttribute(ATTR_CLASS);
		if (cls == null) {
			InitException.reportMissingAttribute(element, ATTR_CLASS);
			return;
		}
		try {
			listeners.add((ITernServerListener)element.createExecutableExtension(ATTR_CLASS));
		} catch (CoreException e) {
			new GenuitecCoreException(TernCorePlugin.getDefault(), e).log();
		}
	}
	
	public static List<ITernServerListener> getGlobalTernServerListeners() {
		return listeners;
	}

}
