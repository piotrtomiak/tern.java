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
package tern.eclipse.ide.core;

import org.eclipse.core.resources.IProject;
import org.eclipse.core.resources.IProjectNature;
import org.eclipse.core.runtime.CoreException;

/**
 * Eclipse Tern nature with ID "tern.eclipse.ide.core.ternature".
 * 
 */
public class TernNature implements IProjectNature {

	public static final String ID = TernCorePlugin.PLUGIN_ID + ".ternnature"; //$NON-NLS-1$

	private IProject project;

	public boolean isConfigured() throws CoreException {
		if (project == null) return false;
		//ME: builder code removed, it is not needed and only modifies
		//    users configuration files.
		return true;
	}
	
	@Override
	public void configure() throws CoreException {
	}

	@Override
	public void deconfigure() throws CoreException {
	}

	public IProject getProject() {
		return project;
	}

	public void setProject(IProject value) {
		project = value;
	}

}
