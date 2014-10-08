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
package tern.eclipse.ide.internal.core.scriptpath;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

import org.eclipse.core.resources.IFile;

import tern.TernFileManager;
import tern.eclipse.ide.core.scriptpath.IScriptResource;
import tern.server.protocol.TernDoc;

import com.eclipsesource.json.JsonArray;

/**
 * HTML/JSP page script path. This script path implementation gives the
 * capability to select an js file with "Add File" in the Tern "Script Path"
 * property page project.
 * 
 */
public class JSFileScriptPath extends AbstractTernScriptPath {

	private final List<IScriptResource> resources;

	public JSFileScriptPath(IFile file, String external) {
		super(file, ScriptPathsType.FILE, external);
		this.resources = new ArrayList<IScriptResource>();
		resources.add(new JSFileScriptResource(file));
	}

	@Override
	public Collection<IScriptResource> getScriptResources() {
		return resources;
	}

	@Override
	public void updateFiles(TernFileManager ternFileManager, TernDoc doc,
			JsonArray names) throws IOException {
		//fail safe
		if (getResource().exists()) {
			ternFileManager.updateFile(getResource(), doc, names);
		}
	}

}
