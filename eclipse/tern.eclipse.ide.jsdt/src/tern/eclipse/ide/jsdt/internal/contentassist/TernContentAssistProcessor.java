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
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

import org.eclipse.core.resources.IProject;
import org.eclipse.core.runtime.IProgressMonitor;
import org.eclipse.jface.text.contentassist.ICompletionProposal;
import org.eclipse.jface.text.contentassist.IContextInformationValidator;
import org.eclipse.wst.jsdt.internal.ui.text.java.JavaParameterListValidator;
import org.eclipse.wst.jsdt.ui.text.java.IJavaCompletionProposal;
import org.eclipse.wst.sse.ui.contentassist.CompletionProposalInvocationContext;
import org.eclipse.wst.sse.ui.contentassist.ICompletionProposalComputer;
import org.eclipse.wst.xml.ui.internal.contentassist.AbstractContentAssistProcessor;

import tern.ITernFile;
import tern.ITernProject;
import tern.eclipse.ide.jsdt.internal.JSDTTernPlugin;
import tern.eclipse.ide.jsdt.internal.Trace;
import tern.eclipse.ide.jsdt.internal.contentassist.ITernContextProvider.TernContext;
import tern.eclipse.ide.ui.contentassist.TernCompletionsQueryFactory;
import tern.server.protocol.completions.TernCompletionsQuery;

/**
 * Content assist processor to manage completion Proposal for JavaScript (inside
 * HTML)
 * 
 */
@SuppressWarnings({ "restriction", "deprecation" })
public class TernContentAssistProcessor extends AbstractContentAssistProcessor
		implements ICompletionProposalComputer {

	private static final Comparator<ICompletionProposal> COMPARATOR = new Comparator<ICompletionProposal>() {
		@Override
		public int compare(ICompletionProposal o1, ICompletionProposal o2) {
			int result = relevance(o2) - relevance(o1);
			if (result == 0) {
				result = o1.getDisplayString().compareToIgnoreCase(o2.getDisplayString());
			}
			return result;
		}

		private int relevance(ICompletionProposal proposal) {
			if (proposal instanceof IJavaCompletionProposal) {
				return ((IJavaCompletionProposal) proposal).getRelevance();
			}
			return 0;
		}
		
	};
	
	private IContextInformationValidator fValidator;

	@Override
	public List computeCompletionProposals(
			CompletionProposalInvocationContext context,
			IProgressMonitor monitor) {
		final List<ICompletionProposal> proposals = new ArrayList<ICompletionProposal>();

		TernContext ternContext = JSDTTernPlugin.getContextProvider().getTernContext(context);
		
		if (ternContext != null) {
				try {
					ITernProject ternProject = ternContext.project;
					ITernFile tf = ternContext.file;
					IProject project = (IProject) ternProject.getAdapter(IProject.class);

					int startOffset = context.getInvocationOffset();
					String filename = tf.getFullName(ternProject);
					TernCompletionsQuery query = TernCompletionsQueryFactory
							.createQuery(project, filename, startOffset);

					ternProject.request(query, tf,
							new JSDTTernCompletionCollector(proposals,
									startOffset, tf, ternProject));

				} catch (Exception e) {
					Trace.trace(Trace.SEVERE,
							"Error while JSDT Tern completion.", e);
				}
		}
		//proposals have to be sorted
		Collections.sort(proposals, COMPARATOR);
		return proposals;
	}

	@Override
	public List computeContextInformation(
			CompletionProposalInvocationContext context,
			IProgressMonitor monitor) {
		return Arrays.asList(computeContextInformation(context.getViewer(),
				context.getInvocationOffset()));
	}

	@Override
	public void sessionEnded() {

	}

	@Override
	public void sessionStarted() {

	}

	@Override
	public IContextInformationValidator getContextInformationValidator() {
		if (fValidator == null) {
			fValidator = new JavaParameterListValidator();
		}
		return fValidator;
	}

}
