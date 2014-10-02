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
package tern.eclipse.ide.ui.contentassist;

import java.util.List;

import org.eclipse.jface.text.contentassist.ICompletionProposal;

import tern.server.ITernServer;
import tern.server.protocol.completions.IMeTernCompletionCollector;
import tern.server.protocol.completions.ITernCompletionCollector;

/**
 * Tern collector which creates {@link JSTernCompletionProposal}.
 * 
 */
public class JSTernCompletionCollector implements ITernCompletionCollector, 
		IMeTernCompletionCollector {

	private final List<ICompletionProposal> proposals;
	private final int startOffset;

	public JSTernCompletionCollector(List<ICompletionProposal> proposals,
			int startOffset) {
		this.proposals = proposals;
		this.startOffset = startOffset;
	}

	@Override
	public void addProposal(String name, String type, String doc, String url,
			String origin, int pos, Object completion, ITernServer ternServer) {
		addProposal(name, type, doc, url, origin, false, 100000, pos, 
				completion, ternServer);
	}

	
	@Override
	public void addProposal(String name, String type, String doc, String url,
			String origin, boolean keyword, int depth, int pos,
			Object completion, ITernServer ternServer) {
		JSTernCompletionProposal proposal = createProposal(name, type, doc,
				url, origin, keyword, depth, pos, startOffset);
		proposals.add(proposal);

		// expand functions if the functiosn contains several "optionnal"
		// parameters.
		// ex : the expansion of "fn(selector: string, context?: frameElement)"
		// returns an array of functions
		//
		String[] functions = proposal.expand();
		if (functions != null) {
			for (int i = 0; i < functions.length; i++) {
				proposals.add(createProposal(name, functions[i], doc, url,
						origin, false, depth, pos, startOffset));
			}
		}

	}

	protected JSTernCompletionProposal createProposal(String name, String type,
			String doc, String url, String origin, boolean keyword, int depth,
			int pos, int startOffset) {
		return new JSTernCompletionProposal(name, type, doc, url, origin, keyword,
				pos, startOffset);
	}

	/**
	 * Completion proposal factory.
	 * 
	 * @param name
	 * @param type
	 * @param doc
	 * @param url
	 * @param origin
	 * @param pos
	 * @param startOffset
	 * @return
	 */
	@Deprecated
	protected JSTernCompletionProposal createProposal(String name, String type,
			String doc, String url, String origin, int pos, int startOffset) {
		return createProposal(name, type, doc, url, origin, false, 
				100000, pos, startOffset);
	}
}
