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
package tern.eclipse.ide.linter.jshint.internal.ui.properties;

import tern.eclipse.ide.linter.ui.properties.TernLinterPropertyPage;
import tern.server.TernPlugin;

/**
 * Tern JSHint preferences page.
 * 
 */
public class TernJSHintPropertyPage extends TernLinterPropertyPage {

	public TernJSHintPropertyPage() {
		super(TernPlugin.jshint.getName());
	}

}
