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
package tern.eclipse.ide.core;

import org.eclipse.core.resources.IContainer;

public interface IScopeContext {

	void addExclude(IContainer container);

	boolean isExclude(IContainer container);

	void addInclude(IContainer container);

	boolean isInclude(IContainer container);

	void addAcceptedExtension(String ext);
	
	boolean isAcceptedExtension(String ext);
	
}
