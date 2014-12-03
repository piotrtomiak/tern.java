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
package tern.server.protocol.completions;

import tern.server.ITernServer;

/**
 * Enhanced Collector to collect result of completion.
 *
 */
public interface IMeTernCompletionCollector {

	void addProposal(String name, String type, String doc, String url,
			String origin, boolean keyword, int depth, int start, int end, 
			Object completion, ITernServer ternServer);
	
}
