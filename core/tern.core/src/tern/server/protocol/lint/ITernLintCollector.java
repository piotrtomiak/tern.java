/**
 *  Copyright (c) 2013-2015 Angelo ZERR and Genuitec LLC.
 *  All rights reserved. This program and the accompanying materials
 *  are made available under the terms of the Eclipse Public License v1.0
 *  which accompanies this distribution, and is available at
 *  http://www.eclipse.org/legal/epl-v10.html
 *
 *  Contributors:
 *  Angelo Zerr <angelo.zerr@gmail.com> - initial API and implementation
 *  Piotr Tomiak <piotr@genuitec.com> - collectors API and code refactoring
 */
package tern.server.protocol.lint;

import tern.server.protocol.ITernResultsCollector;

public interface ITernLintCollector extends ITernResultsCollector {

	void startLint(String file);

	void addMessage(String message, Long start, Long end, String severity,
			String file);

	void endLint(String file);

}
