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
package tern.eclipse.ide.ui.handlers;

import java.io.IOException;

import org.eclipse.core.commands.AbstractHandler;
import org.eclipse.core.commands.ExecutionEvent;
import org.eclipse.core.commands.ExecutionException;
import org.eclipse.core.resources.IProject;
import org.eclipse.core.resources.ResourcesPlugin;
import org.eclipse.core.resources.WorkspaceJob;
import org.eclipse.core.runtime.CoreException;
import org.eclipse.core.runtime.IProgressMonitor;
import org.eclipse.core.runtime.IStatus;
import org.eclipse.core.runtime.Platform;
import org.eclipse.core.runtime.Status;
import org.eclipse.core.runtime.preferences.DefaultScope;
import org.eclipse.core.runtime.preferences.IPreferencesService;
import org.eclipse.core.runtime.preferences.IScopeContext;
import org.eclipse.core.runtime.preferences.InstanceScope;
import org.eclipse.jface.viewers.ISelection;
import org.eclipse.jface.viewers.IStructuredSelection;
import org.eclipse.jface.window.Window;
import org.eclipse.swt.widgets.Shell;
import org.eclipse.ui.IWorkbenchWindow;
import org.eclipse.ui.handlers.HandlerUtil;

import com.genuitec.eclipse.core.util.PlatformUIUtil;
import com.genuitec.eclipse.core.util.PreferencesUtils;

import tern.EcmaVersion;
import tern.eclipse.ide.core.IIDETernProject;
import tern.eclipse.ide.core.TernCorePlugin;
import tern.eclipse.ide.core.preferences.TernCorePreferenceConstants;
import tern.eclipse.ide.internal.ui.Trace;
import tern.eclipse.ide.ui.TernUIPlugin;
import tern.server.ITernModule;
import tern.utils.TernModuleHelper;

/**
 * Abstract class to convert selected project to Tern project.
 * 
 */
public abstract class AbstractConvertProjectCommandHandler extends
		AbstractHandler {

	private IPreferencesService fPreferenceService;

	public AbstractConvertProjectCommandHandler() {
		fPreferenceService = Platform.getPreferencesService();
	}

	private void doInstall(IProject project, IProgressMonitor monitor,
			ExecutionEvent event) throws CoreException {
		// Get or create tern project.
		boolean force = !TernCorePlugin.hasTernNature(project);
		IIDETernProject ternProject = TernCorePlugin.getTernProject(project,
				force);

		IScopeContext[] context = new IScopeContext[] {
				InstanceScope.INSTANCE, DefaultScope.INSTANCE };

		// Upate ECMAScript version
		EcmaVersion ecmaVersion = getEcmaVersion(context);
		ternProject.setEcmaVersion(ecmaVersion);
		
		// Update tern modules : JSON type definitions + plugins
		ITernModule modules[] = getModules(context);
		for (int i = 0; i < modules.length; i++) {
			TernModuleHelper.update(modules[i], ternProject);
		}

		showPropertiesOn(project, monitor, event);

		// save tern project if needed
		try {
			ternProject.save();
		} catch (IOException e) {
			Trace.trace(Trace.SEVERE,
					"Error while configuring tern nature.", e);
		}
	}

	private void doUninstall(IProject project, IProgressMonitor monitor) {

	}

	public Object execute(final ExecutionEvent event) throws ExecutionException {

		final IProject project = getSelectedProject(event);

		if (project == null) {
			return null;
		}

		WorkspaceJob convertJob = new WorkspaceJob(
				getConvertingProjectJobTitle(project)) {
			public IStatus runInWorkspace(IProgressMonitor monitor)
					throws CoreException {
				doInstall(project, monitor, event);
				return Status.OK_STATUS;
			}
		};
		convertJob.setUser(true);
		convertJob.setRule(ResourcesPlugin.getWorkspace().getRoot());
		convertJob.schedule();

		return null;
	}

	private IProject getSelectedProject(ExecutionEvent event) {
		ISelection currentSelection = HandlerUtil.getCurrentSelection(event);

		if (currentSelection instanceof IStructuredSelection) {
			Object element = ((IStructuredSelection) currentSelection)
					.getFirstElement();
			return (IProject) Platform.getAdapterManager().getAdapter(element,
					IProject.class);
		}
		return null;
	}

	private void showPropertiesOn(final IProject project,
			final IProgressMonitor monitor, final ExecutionEvent event) {
		Shell shell = null;
		IWorkbenchWindow activeWorkbenchWindow = PlatformUIUtil.getActiveWorkbenchWindow();
		if (activeWorkbenchWindow != null)
			shell = activeWorkbenchWindow.getShell();
		final Shell finalShell = shell;
		if (finalShell != null) {
			finalShell.getDisplay().asyncExec(new Runnable() {
				public void run() {
					if (PreferencesUtils
							.openPropertiesDialog(
									project,
									finalShell,
									"myeclipse.root/org.eclipse.wst.jsdt.ui.propertyPages.BuildPathsPropertyPage", //$NON-NLS-1$
									null,
									"myeclipse.root/org.eclipse.wst.jsdt.internal.ui.preferences.JavaScriptMainPage") == Window.CANCEL) { //$NON-NLS-1$
						doUninstall(project, monitor);
					}
				}
			});
		}
	}

	/**
	 * Returns the preferences ecma version.
	 * 
	 * @param context
	 * @return the preferences ecma version.
	 */
	protected EcmaVersion getEcmaVersion(IScopeContext[] context) {
		int version = fPreferenceService.getInt(TernCorePlugin
				.getDefault().getBundle().getSymbolicName(),
				TernCorePreferenceConstants.DEFAULT_ECMA_VERSION,
				TernCorePreferenceConstants.DEFAULT_ECMA_VERSION_VALUE,
				context);
		return EcmaVersion.get(version);
	}
	
	/**
	 * Returns the preferences list of tern modules.
	 * @param context
	 * @return the preferences list of tern modules.
	 */
	protected ITernModule[] getModules(IScopeContext[] context) {
		String moduleNames = fPreferenceService.getString(TernCorePlugin
				.getDefault().getBundle().getSymbolicName(),
				TernCorePreferenceConstants.DEFAULT_TERN_MODULES,
				TernCorePreferenceConstants.DEFAULT_TERN_MODULES_VALUE,
				context);
		return TernCorePlugin.getTernRepositoryManager().getTernModules(
				moduleNames, null);
	}
	
	protected abstract String getConvertingProjectJobTitle(IProject project);

}
