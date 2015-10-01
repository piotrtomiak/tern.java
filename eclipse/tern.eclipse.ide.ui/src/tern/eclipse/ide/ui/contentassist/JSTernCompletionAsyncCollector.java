/**
 *  Copyright (c) 2013-2015 Angelo ZERR and Genuitec LLC.
 *  All rights reserved. This program and the accompanying materials
 *  are made available under the terms of the Eclipse Public License v1.0
 *  which accompanies this distribution, and is available at
 *  http://www.eclipse.org/legal/epl-v10.html
 *
 *  Contributors:
 *  Angelo Zerr <angelo.zerr@gmail.com> - initial API and implementation
 *  Piotr Tomiak <piotr@genuitec.com> - asynchronous request processing
 *  									refactoring of collectors API
 *  									unified completion proposals calculation 
 */
package tern.eclipse.ide.ui.contentassist;

import java.util.List;

import org.eclipse.core.runtime.IStatus;
import org.eclipse.core.runtime.Status;
import org.eclipse.jface.text.contentassist.ICompletionProposal;

import tern.ITernFile;
import tern.ITernProject;
import tern.eclipse.ide.core.TernCorePlugin;
import tern.server.protocol.IJSONObjectHelper;
import tern.server.protocol.ITernResultsAsyncCollector;
import tern.server.protocol.completions.TernCompletionProposalRec;

public class JSTernCompletionAsyncCollector extends JSTernCompletionCollector
		implements ITernResultsAsyncCollector {

	private boolean timedOut;
	private boolean contentAdded;

	private int startOffset;

	public JSTernCompletionAsyncCollector(List<ICompletionProposal> proposals,
			int startOffset, ITernFile ternFile, ITernProject project) {
		super(proposals, startOffset, ternFile, project);
		this.startOffset = startOffset;
	}

	@Override
	public void addProposal(TernCompletionProposalRec proposal,
			Object completion, IJSONObjectHelper jsonObjectHelper) {
		if (!timedOut) {
			contentAdded = true;
			super.addProposal(proposal, completion, jsonObjectHelper);
		}
	}

	@Override
	public void done() {
		if (!timedOut) {
			contentAdded = true;
		}
	}
	
	@Override
	public void error(Throwable err) {
		TernCorePlugin
				.getDefault()
				.getLog()
				.log(new Status(IStatus.ERROR, TernCorePlugin.PLUGIN_ID, err
						.getMessage(), err));
	}

	@Override
	public String getRequestDisplayName() {
		return "Calculating completion proposals...";
	}

	public void timeout(final TimeoutReason reason) {
		timedOut = true;
		if (!contentAdded) {
			proposals.add(createTimeoutProposal(startOffset, reason));
		}
	}

	protected ICompletionProposal createTimeoutProposal(int startOffset,
			TimeoutReason reason) {
		return new TimeoutProposal(startOffset, reason);
	}

}
