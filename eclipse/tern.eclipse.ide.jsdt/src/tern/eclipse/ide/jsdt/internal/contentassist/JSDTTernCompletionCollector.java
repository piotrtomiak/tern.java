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
package tern.eclipse.ide.jsdt.internal.contentassist;

import java.util.List;

import org.eclipse.core.resources.IProject;
import org.eclipse.jface.dialogs.Dialog;
import org.eclipse.jface.resource.JFaceResources;
import org.eclipse.jface.text.IDocument;
import org.eclipse.jface.text.contentassist.ICompletionProposal;
import org.eclipse.jface.text.contentassist.ICompletionProposalExtension4;
import org.eclipse.jface.text.contentassist.IContextInformation;
import org.eclipse.swt.graphics.Image;
import org.eclipse.swt.graphics.Point;

import tern.eclipse.ide.ui.contentassist.JSTernCompletionCollector;
import tern.eclipse.ide.ui.contentassist.JSTernCompletionProposal;

/**
 * Extends {@link JSTernCompletionCollector} to create JSDT
 * {@link JSDTTernCompletionProposal}.
 * 
 */
public class JSDTTernCompletionCollector extends JSTernCompletionCollector {

	public JSDTTernCompletionCollector(List<ICompletionProposal> proposals,
			int startOffset, IProject project) {
		super(proposals, startOffset, project);
	}

	@Override
	protected JSTernCompletionProposal createProposal(String name, String type,
			String doc, String url, String origin, boolean keyword, int depth,
			int pos, int startOffset) {
		return new JSDTTernCompletionProposal(name, type, doc, url, 
				origin, keyword, depth, pos, startOffset);
	}

	public void timedOut(final String message) {
		proposals.add(new InfoProposal(startOffset, message));
	}
	
	private static final class InfoProposal implements ICompletionProposal, ICompletionProposalExtension4 {

		private int startOffset;
		private String message;
		
		public InfoProposal(int startOffset, String message) {
			this.startOffset = startOffset;
			this.message = message;
		}
		
		@Override
		public Point getSelection(IDocument document) {
			return new Point(startOffset, 0);
		}
		
		@Override
		public Image getImage() {
			return JFaceResources.getImage(Dialog.DLG_IMG_MESSAGE_INFO);
		}
		
		@Override
		public String getDisplayString() {
			return message;
		}
		
		@Override
		public IContextInformation getContextInformation() {
			return null;
		}
		
		@Override
		public String getAdditionalProposalInfo() {
			return null;
		}
		
		@Override
		public void apply(IDocument document) {
			//do nothing
		}

		@Override
		public boolean isAutoInsertable() {
			return false;
		}
		
	}
	
}
