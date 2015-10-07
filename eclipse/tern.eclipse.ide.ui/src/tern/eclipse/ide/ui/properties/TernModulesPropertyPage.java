/**
 *  Copyright (c) 2013-2015 Angelo ZERR.
 *  All rights reserved. This program and the accompanying materials
 *  are made available under the terms of the Eclipse Public License v1.0
 *  which accompanies this distribution, and is available at
 *  http://www.eclipse.org/legal/epl-v10.html
 *
 *  Contributors:
 *  Angelo Zerr <angelo.zerr@gmail.com> - initial API and implementation
 */
package tern.eclipse.ide.ui.properties;

import org.eclipse.core.resources.IResource;
import org.eclipse.swt.SWT;
import org.eclipse.swt.layout.GridData;
import org.eclipse.swt.layout.GridLayout;
import org.eclipse.swt.widgets.Composite;
import org.eclipse.swt.widgets.Control;
import org.eclipse.swt.widgets.Display;
import org.eclipse.ui.IWorkbench;
import org.eclipse.ui.IWorkbenchPreferencePage;

import tern.eclipse.ide.core.IWorkingCopy;
import tern.eclipse.ide.core.IWorkingCopyListener;
import tern.eclipse.ide.core.TernCorePlugin;
import tern.eclipse.ide.internal.core.resources.IDETernProject.TernModuleModifyBroadCastMonitor;
import tern.eclipse.ide.internal.ui.TernUIMessages;
import tern.eclipse.ide.internal.ui.Trace;
import tern.eclipse.ide.ui.ImageResource;
import tern.eclipse.ide.ui.TernUIPlugin;
import tern.eclipse.ide.ui.controls.TernModulesBlock;
import tern.server.ITernModule;

/**
 * Tern Modules (Plugins + JSON Type Definitions) property page.
 * 
 */
public class TernModulesPropertyPage extends AbstractTernPropertyPage
		implements IWorkbenchPreferencePage, IWorkingCopyListener {

	private TernModulesBlock modulesBlock;

	public TernModulesPropertyPage() {
		super();
		setImageDescriptor(ImageResource.getImageDescriptor(ImageResource.IMG_LOGO));
	}

	@Override
	public void init(IWorkbench workbench) {
		setPreferenceStore(TernUIPlugin.getDefault().getPreferenceStore());
	}

	@Override
	public Control createContents(Composite ancestor) {
		Composite parent = new Composite(ancestor, SWT.NONE);
		parent.setLayoutData(new GridData(GridData.FILL_BOTH));
		
		initializeDialogUnits(parent);

		noDefaultAndApplyButton();

		GridLayout layout = new GridLayout();
		layout.numColumns = 1;
		layout.marginHeight = 0;
		layout.marginWidth = 0;
		parent.setLayout(layout);

		// create UI modules
		IResource resource = getResource();
		modulesBlock = new TernModulesBlock(resource != null ? resource.getProject() : null,
				TernUIMessages.TernModulesPropertyPage_desc);
		Control control = modulesBlock.createControl(parent);
		GridData data = new GridData(GridData.FILL_BOTH);
		data.horizontalSpan = 1;
		control.setLayoutData(data);

		// load modules
		refreshModules();

		applyDialogFont(parent);
		return parent;
	}

	public void refreshModules() {
		try {
			if (TernCorePlugin.hasTernNature(getResource().getProject())) {
				IWorkingCopy workingCopy = getWorkingCopy();
				workingCopy.addWorkingCopyListener(this);
				modulesBlock.refresh(workingCopy.getFilteredModules(), workingCopy.getCheckedModules());
			}
		} catch (Throwable e) {
			Trace.trace(Trace.SEVERE, "Error while loading tern project", e);
		}
	}
	
	@Override
	public final boolean performOk() {
		if (super.performOk()) {
			//Refresh modules after OK is performed.
			//Handles the case of new JavaScript wizard.
			Display.getDefault().asyncExec(new Runnable() {
				@Override
				public void run() {
					if (!modulesBlock.isDisposed()) {
						refreshModules();
					}
				}
			});
			return true;
		}
		return false;
	}

	@Override
	protected void doPerformOk() throws Exception {
		// Broadcast fire event
		TernModuleModifyBroadCastMonitor.fireEvent();
		
		if (Thread.currentThread() == Display.getDefault().getThread()) {
			// save column settings
			modulesBlock.saveColumnSettings();
		} else {
			Display.getDefault().asyncExec(new Runnable() {
				@Override
				public void run() {
					if (!modulesBlock.isDisposed()) {
						// save column settings
						modulesBlock.saveColumnSettings();
					}
				}
			});
		}
	}

	public boolean hasChanges() {
		return modulesBlock != null && modulesBlock.isModified();
	}
	
	public void reset() {
		if (Thread.currentThread() != Display.getDefault().getThread()) {
			Display.getDefault().asyncExec(new Runnable() {
				@Override
				public void run() {
					reset();
				}
			});
		} else if (modulesBlock != null && !modulesBlock.isDisposed()) {
			modulesBlock.loadModules();
		}
	}


	@Override
	public void moduleSelectionChanged(ITernModule module, boolean selected) {
		if (!modulesBlock.isCheckUpdating()) {
			modulesBlock.setCheckedModule(module, selected);
		}
	}

}
