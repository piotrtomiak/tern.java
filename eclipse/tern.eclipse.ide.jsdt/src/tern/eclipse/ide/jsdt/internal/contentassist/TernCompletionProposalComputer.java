/**
 *  Copyright (c) 2013-2014 Angelo ZERR and Genuitec LLC.
 *  All rights reserved. This program and the accompanying materials
 *  are made available under the terms of the Eclipse Public License v1.0
 *  which accompanies this distribution, and is available at
 *  http://www.eclipse.org/legal/epl-v10.html
 *
 *  Contributors:
 *  Angelo Zerr <angelo.zerr@gmail.com> - initial API and implementation
 *  Piotr Tomiak <piotr@genuitec.com> - refactoring of file management API
 */
package tern.eclipse.ide.jsdt.internal.contentassist;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import org.eclipse.core.resources.IProject;
import org.eclipse.core.runtime.IProgressMonitor;
import org.eclipse.jface.text.contentassist.ICompletionProposal;
import org.eclipse.wst.jsdt.ui.text.java.ContentAssistInvocationContext;
import org.eclipse.wst.jsdt.ui.text.java.IJavaCompletionProposalComputer;
import org.eclipse.wst.jsdt.ui.text.java.JavaContentAssistInvocationContext;

import tern.ITernFile;
import tern.ITernProject;
import tern.eclipse.ide.jsdt.internal.JSDTTernPlugin;
import tern.eclipse.ide.jsdt.internal.Trace;
import tern.eclipse.ide.jsdt.internal.contentassist.ITernContextProvider.TernContext;
import tern.eclipse.ide.ui.contentassist.TernCompletionsQueryFactory;
import tern.server.protocol.completions.TernCompletionsQuery;

/**
 * JSDT completion proposal computer manage completion Proposal for Javascript
 * (inside JavaScript files)
 * 
 */
public class TernCompletionProposalComputer implements
		IJavaCompletionProposalComputer {

	public List computeCompletionProposals(
			ContentAssistInvocationContext context, IProgressMonitor monitor) {
		if (context instanceof JavaContentAssistInvocationContext) {
			JavaContentAssistInvocationContext javaContext = (JavaContentAssistInvocationContext) context;

			TernContext ternContext = JSDTTernPlugin.getContextProvider().getTernContext(javaContext);
			if (ternContext != null) {
					try {

						final List<ICompletionProposal> proposals = new ArrayList<ICompletionProposal>();

						ITernFile tf = ternContext.file;
						ITernProject ternProject = ternContext.project;
						IProject project = (IProject)ternProject.getAdapter(IProject.class);
						
						int startOffset = context.getInvocationOffset();
						String filename = tf.getFullName(ternProject);
						TernCompletionsQuery query = TernCompletionsQueryFactory
								.createQuery(project, filename, startOffset);

						
						ternProject.request(query, tf,
								new JSDTTernCompletionCollector(proposals,
										startOffset, tf, ternProject));
						return proposals;

					} catch (Exception e) {
						Trace.trace(Trace.SEVERE,
								"Error while JSDT Tern completion.", e);
					}
			}
		}
		return Collections.EMPTY_LIST;
	}

	public List computeContextInformation(
			ContentAssistInvocationContext context, IProgressMonitor monitor) {
		return Collections.EMPTY_LIST;
	}

	public String getErrorMessage() {
		return null;
	}

	public void sessionStarted() {
	}

	public void sessionEnded() {
	}
}
