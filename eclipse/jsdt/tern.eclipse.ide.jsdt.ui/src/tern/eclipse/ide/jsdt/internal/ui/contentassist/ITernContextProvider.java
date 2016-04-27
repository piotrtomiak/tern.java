/**
 *  Copyright (c) 2015 Genuitec LLC.
 *  All rights reserved. This program and the accompanying materials
 *  are made available under the terms of the Eclipse Public License v1.0
 *  which accompanies this distribution, and is available at
 *  http://www.eclipse.org/legal/epl-v10.html
 *
 *  Contributors:
 *  Piotr Tomiak <piotr@genuitec.com> - initial API and implementation
 */
package tern.eclipse.ide.jsdt.internal.ui.contentassist;

import org.eclipse.jface.text.ITextViewer;

import tern.ITernFile;
import tern.ITernProject;

public interface ITernContextProvider {

	TernContext getTernContext(Object context);

	public static final class TernContext {

		public final ITernFile file;
		public final ITernProject project;
		public final int invocationOffset;
		public final ITextViewer viewer;

		public TernContext(ITernProject project, ITernFile file,
				int invocationOffset, ITextViewer viewer) {
			this.project = project;
			this.file = file;
			this.invocationOffset = invocationOffset;
			this.viewer = viewer;
		}

	}

}
