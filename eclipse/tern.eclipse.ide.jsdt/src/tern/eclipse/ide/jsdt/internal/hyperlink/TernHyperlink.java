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
package tern.eclipse.ide.jsdt.internal.hyperlink;

import java.text.MessageFormat;

import org.eclipse.core.resources.IFile;
import org.eclipse.core.resources.IResource;
import org.eclipse.jface.text.IDocument;
import org.eclipse.jface.text.IRegion;
import org.eclipse.osgi.util.NLS;

import tern.ITernFile;
import tern.eclipse.ide.core.IIDETernProject;
import tern.eclipse.ide.core.resources.TernDocumentFile;
import tern.eclipse.ide.internal.ui.TernUIMessages;
import tern.eclipse.ide.ui.hyperlink.AbstractTernHyperlink;
import tern.server.protocol.definition.TernDefinitionQuery;

/**
 * Tern hyperlink used to "go to the definition" of js element by using tern
 * definition.
 * 
 */
public class TernHyperlink extends AbstractTernHyperlink {

	private final IDocument document;
	private final IResource resource;

	public TernHyperlink(IDocument document, IRegion region,
			IResource resource, IIDETernProject ternProject) {
		super(region, ternProject);
		this.document = document;
		this.resource = resource;
	}

	@Override
	public String getTypeLabel() {
		return "Tern Hyperlink";
	}

	@Override
	public String getHyperlinkText() {
		String path = resource.getFullPath().toOSString();
		if (path.length() > 60) {
			path = path.substring(0, 25) + "..." + path.substring(path.length() - 25, path.length()); //$NON-NLS-1$
		}
		return MessageFormat.format("Go to definition ''{0}''", path);
	}

	@Override
	public void open() {
		try {
			IFile file = (IFile) resource;
			ITernFile tf = new TernDocumentFile(file, document);
			String filename = tf.getFullName(ternProject);
			Integer pos = region.getOffset();
			TernDefinitionQuery query = new TernDefinitionQuery(filename, pos);
			ternProject.request(query, tf, this);
		} catch (Exception e) {
			e.printStackTrace();
		}
	}
}
