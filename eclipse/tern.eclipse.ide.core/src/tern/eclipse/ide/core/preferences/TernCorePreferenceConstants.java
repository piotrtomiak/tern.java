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
package tern.eclipse.ide.core.preferences;

import tern.ContentScope;
import tern.EcmaVersion;
import tern.server.TernPlugin;
import tern.utils.TernModuleHelper;

/**
 * Tern Core preferences constants.
 * 
 */
public class TernCorePreferenceConstants {

	/**
	 * Server preferences consttants.
	 */
	public static final String TERN_SERVER_TYPE = "ternServerType"; //$NON-NLS-1$
	public static final String DISABLE_ASYNC_REQUESTS = "disableAsyncRequests"; //$NON-NLS-1$

	/**
	 * Tern development preferences constants.
	 */
	public static final String DEVELOPMENT_USE_PROJECT_SETTINGS = "development-use-project-settings";//$NON-NLS-1$
	public static final String TRACE_ON_CONSOLE = "traceOnConsole"; //$NON-NLS-1$
	public static final String LOADING_LOCAL_PLUGINS = "loadingLocalPlugin"; //$NON-NLS-1$
	public static final String QUALITY_LEVEL = "qualityLevel"; //$NON-NLS-1$
	public static final String REQUEST_TIMEOUT = "requestTimeout"; //$NON-NLS-1$
	public static final String CONTENT_SCOPE = "contentScope"; //$NON-NLS-1$

	/**
	 * Tern repository preferences constants.
	 */
	public static final String REPOSITORY_USE_PROJECT_SETTINGS = "repository-use-project-settings";//$NON-NLS-1$
	public static final String REPOSITORIES = "repositories"; //$NON-NLS-1$
	public static final String USED_REPOSITORY_NAME = "used-repository-name"; //$NON-NLS-1$

	/**
	 * Tern validation preferences constants.
	 */
	public static final String VALIDATION_USE_PROJECT_SETTINGS = "validation-use-project-settings";//$NON-NLS-1$

	/**
	 * Default tern modules to add to .tern-project when project is converted to
	 * tern project.
	 */
	public static final String DEFAULT_ECMA_VERSION = "ecmaVersion"; //$NON-NLS-1$
	public static final int DEFAULT_ECMA_VERSION_VALUE = EcmaVersion.ES6.getVersion();

	/**
	 * Default tern modules to add to .tern-project when project is converted to
	 * tern project.
	 */
	public static final String DEFAULT_TERN_MODULES = "defaultTernModules"; //$NON-NLS-1$
	public static final String DEFAULT_TERN_MODULES_VALUE = getDefaultModules(); //$NON-NLS-1$

	public static final int DEFAULT_QUALITY_LEVEL = 1;
	public static final int DEFAULT_REQUEST_TIMEOUT = 30;
	public static final ContentScope DEFAULT_CONTENT_SCOPE = ContentScope.WHOLE_PROJECT;
	

	private TernCorePreferenceConstants() {
	}

	/**
	 * Returns the tern modules to add to .tern-project when project is
	 * converted to tern project.
	 * 
	 * @return the tern modules to add to .tern-project when project is
	 *         converted to tern project.
	 */
	private static String getDefaultModules() {
		return TernModuleHelper.getModulesAsString(TernPlugin.guess_types);
	}
}
