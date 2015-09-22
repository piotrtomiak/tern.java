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
package tern.scriptpath;

import tern.ITernAdaptable;
import tern.ITernFile;

/**
 * Script resource.
 * 
 */
public interface ITernScriptResource extends ITernAdaptable {

	/**
	 * The tern file containing scripts.
	 * 
	 * @return
	 */
	ITernFile getFile();

	/**
	 * The label to use when the script resource is displayed in the angular
	 * explorer view.
	 * 
	 * @return the label to use when the script resource is displayed in the
	 *         angular explorer view.
	 */
	String getLabel();

}
