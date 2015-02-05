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
package tern.eclipse.ide.ui.properties;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

import org.eclipse.core.resources.IResource;
import org.eclipse.swt.layout.GridData;
import org.eclipse.swt.layout.GridLayout;
import org.eclipse.swt.widgets.Composite;
import org.eclipse.swt.widgets.Control;
import org.eclipse.swt.widgets.Display;
import org.eclipse.ui.IWorkbench;
import org.eclipse.ui.IWorkbenchPreferencePage;

import tern.eclipse.ide.core.IIDETernProject;
import tern.eclipse.ide.internal.ui.TernUIMessages;
import tern.eclipse.ide.internal.ui.Trace;
import tern.eclipse.ide.internal.ui.properties.AbstractTernPropertyPage;
import tern.eclipse.ide.ui.ImageResource;
import tern.eclipse.ide.ui.TernUIPlugin;
import tern.eclipse.ide.ui.controls.TernModulesBlock;
import tern.metadata.TernModuleMetadata;
import tern.repository.ITernRepository;
import tern.server.ITernModule;
import tern.utils.TernModuleHelper;

/**
 * Tern Modules (Plugins + JSON Type Definitions) property page.
 * 
 */
public class TernModulesPropertyPage extends AbstractTernPropertyPage implements
		IWorkbenchPreferencePage {

	private TernModulesBlock modulesBlock;

	public TernModulesPropertyPage() {
		super();
		setImageDescriptor(ImageResource
				.getImageDescriptor(ImageResource.IMG_LOGO));
	}

	@Override
	public void init(IWorkbench workbench) {
		setPreferenceStore(TernUIPlugin.getDefault().getPreferenceStore());
	}

	@Override
	public Control createContents(Composite parent) {
		initializeDialogUnits(parent);

		noDefaultAndApplyButton();

		GridLayout layout = new GridLayout();
		layout.numColumns = 1;
		layout.marginHeight = 0;
		layout.marginWidth = 0;
		parent.setLayout(layout);

		// create UI modules
		IResource resource = getResource();
		modulesBlock = new TernModulesBlock(
				resource != null ? resource.getProject() : null,
				TernUIMessages.TernModulesPropertyPage_desc);
		Control control = modulesBlock.createControl(parent);
		GridData data = new GridData(GridData.FILL_BOTH);
		data.horizontalSpan = 1;
		control.setLayoutData(data);

		// load modules
		modulesBlock.loadModules();

		applyDialogFont(parent);
		return parent;
	}

	@Override
	public boolean performOk() {
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
		// save the checked plugins in the tern project
		final Object[] checkedModules = modulesBlock.getCheckedModules();
		try {
			IIDETernProject ternProject = getTernProject();
			ITernRepository repository = ternProject.getRepository();
			// clear Plugin + JSON Type Definition
			ternProject.clearPlugins();
			ternProject.clearLibs();
			// Add Plugin + JSON Type Definition
			ITernModule module = null;
			Collection<String> requiredDependencies = null;
			ITernModule dependencyModule = null;
			List<ITernModule> sortedModules = new ArrayList<ITernModule>();
			for (Object m : checkedModules) {
				module = (ITernModule) m;
				TernModuleMetadata metadata = module.getMetadata();
				if (metadata != null) {
					// add required dependencies (ex : if ecma6 is checked,
					// ecma5 must
					// be added too).
					requiredDependencies = metadata
							.getRequiredDependencies(module.getVersion());
					for (String dependency : requiredDependencies) {
						dependencyModule = repository.getModule(dependency);
						if (dependencyModule != null
								&& !sortedModules.contains(dependencyModule)) {
							sortedModules.add(dependencyModule);
						}
					}
				}
				if (module != null && !sortedModules.contains(module)) {
					sortedModules.add(module);
				}

			}
			TernModuleHelper.sort(sortedModules);
			for (ITernModule m : sortedModules) {
				TernModuleHelper.update(m, ternProject);
			}
			ternProject.save();
			if (Thread.currentThread() == Display.getDefault().getThread()) {
				modulesBlock.setCheckedModules(checkedModules);
				modulesBlock.loadModules();
			} else {
				Display.getDefault().asyncExec(new Runnable() {
					@Override
					public void run() {
						if (!modulesBlock.isDisposed()) {
							modulesBlock.setCheckedModules(checkedModules);
							modulesBlock.loadModules();
						}
					}
				});
			}
		} catch (Exception e) {
			Trace.trace(Trace.SEVERE, "Error while saving tern project", e);
		}
		return super.performOk();
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

}
