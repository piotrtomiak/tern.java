/**
 *  Copyright (c) 2013-2014 Angelo ZERR.
 *  All rights reserved. This program and the accompanying materials
 *  are made available under the terms of the Eclipse Public License v1.0
 *  which accompanies this distribution, and is available at
 *  http://www.eclipse.org/legal/epl-v10.html
 *
 *  Contributors:
 *  Angelo Zerr <angelo.zerr@gmail.com> - initial API and implementation
 */
package tern.eclipse.ide.jsdt.internal;

import org.eclipse.ui.plugin.AbstractUIPlugin;
import org.osgi.framework.BundleContext;

import tern.eclipse.ide.jsdt.internal.contentassist.ITernContextProvider;
import tern.eclipse.ide.jsdt.internal.contentassist.JSDTTernContextProvider;
import tern.internal.resources.InternalTernResourcesManager;

/**
 * The activator class controls the plug-in life cycle
 */
@SuppressWarnings("restriction")
public class JSDTTernPlugin extends AbstractUIPlugin {

	// The plug-in ID
	public static final String PLUGIN_ID = "tern.eclipse.ide.jsdt"; //$NON-NLS-1$

	// The shared instance
	private static JSDTTernPlugin plugin;

	private static ITernContextProvider contextProvider = new JSDTTernContextProvider();
	
	/**
	 * The constructor
	 */
	public JSDTTernPlugin() {
	}

	/*
	 * (non-Javadoc)
	 * 
	 * @see
	 * org.eclipse.ui.plugin.AbstractUIPlugin#start(org.osgi.framework.BundleContext
	 * )
	 */
	public void start(BundleContext context) throws Exception {
		super.start(context);
		plugin = this;
		// Initialize DOMProvider with DOM-SSE
		InternalTernResourcesManager.getInstance().setDOMProvider(DOMSSEProvider.INSTANCE);
	}

	/*
	 * (non-Javadoc)
	 * 
	 * @see
	 * org.eclipse.ui.plugin.AbstractUIPlugin#stop(org.osgi.framework.BundleContext
	 * )
	 */
	public void stop(BundleContext context) throws Exception {
		plugin = null;
		super.stop(context);
	}

	/**
	 * Returns the shared instance
	 * 
	 * @return the shared instance
	 */
	public static JSDTTernPlugin getDefault() {
		return plugin;
	}
	
	public static ITernContextProvider getContextProvider() {
		return contextProvider;
	}
	
	public static void setContextProvider(ITernContextProvider projectProvider) {
		JSDTTernPlugin.contextProvider = projectProvider;
	}

}
