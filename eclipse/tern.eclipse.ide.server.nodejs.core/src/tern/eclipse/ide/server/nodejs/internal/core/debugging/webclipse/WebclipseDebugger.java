/*
 * Copyright 2015, Genuitec, LLC
 * All Rights Reserved.
 */
package tern.eclipse.ide.server.nodejs.internal.core.debugging.webclipse;

import java.io.File;

import org.eclipse.core.resources.IFile;
import org.eclipse.debug.core.DebugPlugin;

import tern.TernException;
import tern.eclipse.ide.server.nodejs.core.INodejsDebugger;
import tern.server.nodejs.process.INodejsProcess;

public class WebclipseDebugger implements INodejsDebugger {

	static final String LAUNCH_CONFIG_ID = "com.genuitec.eclipse.javascript.debug.core.jsStandaloneAppLaunchConfigurationType"; //$NON-NLS-1$

	@Override
	public String getName() {
		return "Webclipse JavaScript Debugger";
	}

	@Override
	public String getId() {
		return "webclipse"; //$NON-NLS-1$
	}

	@Override
	public boolean isInstalled() {
		return DebugPlugin.getDefault().getLaunchManager()
				.getLaunchConfigurationType(LAUNCH_CONFIG_ID) != null;
	}

	@Override
	public INodejsProcess createProcess(File projectDir, File nodejsBaseDir,
			IFile ternServerFile) throws TernException {
		return new WebclipseNodejsDebugProcess(nodejsBaseDir, ternServerFile,
				projectDir);
	}

}
