/**
 *  Copyright (c) 2013-2016 Angelo ZERR.
 *  All rights reserved. This program and the accompanying materials
 *  are made available under the terms of the Eclipse Public License v1.0
 *  which accompanies this distribution, and is available at
 *  http://www.eclipse.org/legal/epl-v10.html
 *
 *  Contributors:
 *  Angelo Zerr <angelo.zerr@gmail.com> - initial API and implementation
 */
package tern.eclipse.ide.jsdt.internal.ui.contentassist;

import org.eclipse.wst.jsdt.ui.text.java.IJavaCompletionProposal;

import tern.eclipse.ide.ui.contentassist.JSTernCompletionProposal;
import tern.server.protocol.completions.TernCompletionProposalRec;
import tern.server.protocol.completions.TernTypeHelper;

/**
 * Extends {@link JSTernCompletionProposal} to implements JSDT
 * {@link IJavaCompletionProposal} to set an high relevance for tern completion
 * proposal to display on the top of the completion popup the tern result.
 *
 */
public class JSDTTernCompletionProposal extends JSTernCompletionProposal
		implements IJavaCompletionProposal {

	private static int CATEGORY_SEPARATION = 100000;

	private static int CAT_ORDER_PRIMITIVE_FIELD = 1;
	private static int CAT_ORDER_OBJECT_FIELD = 2;
	private static int CAT_ORDER_FUNCTION = 3;
	private static int CAT_ORDER_PRIMITIVE_STATIC = 4;
	private static int CAT_ORDER_OBJECT_STATIC = 5;
	private static int CAT_ORDER_FUNCTION_OBJECT = 6;
	private static int CAT_ORDER_KEYWORD = 7;

	private int relevance;

	public JSDTTernCompletionProposal(TernCompletionProposalRec proposal) {
		super(proposal);
		relevance = (10 - getCategory()) * CATEGORY_SEPARATION - proposal.depth;
	}

	private int getCategory() {
		if (isKeyword()) {
			return CAT_ORDER_KEYWORD;
		}
		if (isFunction()) {
			return CAT_ORDER_FUNCTION;
		}
		if (TernTypeHelper.isFunctionRefType(getType())) {
			return CAT_ORDER_FUNCTION_OBJECT;
		}

		boolean allUpperCase = true;
		String name = getName();
		for (int i = 0; i < name.length(); i++) {
			if (Character.isLowerCase(name.charAt(i))) {
				allUpperCase = false;
				break;
			}
		}

		String type = getType();
		boolean object = !("bool".equals(type) || "number".equals(type) || "string"
				.equals(type));

		int result;
		if (allUpperCase) {
			if (object) {
				result = CAT_ORDER_OBJECT_STATIC;
			} else {
				result = CAT_ORDER_PRIMITIVE_STATIC;
			}
		} else {
			if (object) {
				result = CAT_ORDER_OBJECT_FIELD;
			} else {
				result = CAT_ORDER_PRIMITIVE_FIELD;
			}
		}

		return result;
	}

	@Override
	public int getRelevance() {
		return relevance;
	}

}
