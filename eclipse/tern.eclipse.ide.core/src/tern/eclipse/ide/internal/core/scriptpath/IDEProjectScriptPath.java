/*
 * Copyright 2014, Genuitec, LLC
 * All Rights Reserved.
 */
package tern.eclipse.ide.internal.core.scriptpath;

import java.util.List;

import org.eclipse.core.resources.IProject;

import tern.ITernProject;
import tern.scriptpath.ITernScriptResource;
import tern.scriptpath.impl.ProjectScriptPath;

public class IDEProjectScriptPath extends ProjectScriptPath {

	public IDEProjectScriptPath(ITernProject project,
			ITernProject ownerProject, String external) {
		super(project, ownerProject, external);
	}

	@Override
	public List<ITernScriptResource> getScriptResources() {
		if (getType() == ScriptPathsType.PROJECT && getProject().equals(getOwnerProject())) {
			return new FolderScriptPath(getProject(), 
					(IProject)getProject().getAdapter(IProject.class), 
					getExternalLabel()).getScriptResources();
		}
		return super.getScriptResources();
	}

}
