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
package tern.eclipse.ide.ui.controls;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.eclipse.core.resources.IProject;
import org.eclipse.core.runtime.CoreException;
import org.eclipse.jface.dialogs.Dialog;
import org.eclipse.jface.dialogs.IDialogSettings;
import org.eclipse.jface.viewers.ArrayContentProvider;
import org.eclipse.jface.viewers.CheckStateChangedEvent;
import org.eclipse.jface.viewers.CheckboxTableViewer;
import org.eclipse.jface.viewers.ICheckStateListener;
import org.eclipse.jface.viewers.ISelectionChangedListener;
import org.eclipse.jface.viewers.IStructuredSelection;
import org.eclipse.jface.viewers.SelectionChangedEvent;
import org.eclipse.jface.viewers.TableViewerColumn;
import org.eclipse.jface.viewers.Viewer;
import org.eclipse.jface.viewers.ViewerSorter;
import org.eclipse.swt.SWT;
import org.eclipse.swt.custom.SashForm;
import org.eclipse.swt.events.SelectionAdapter;
import org.eclipse.swt.events.SelectionEvent;
import org.eclipse.swt.graphics.Font;
import org.eclipse.swt.layout.GridData;
import org.eclipse.swt.layout.GridLayout;
import org.eclipse.swt.widgets.Composite;
import org.eclipse.swt.widgets.Control;
import org.eclipse.swt.widgets.Label;
import org.eclipse.swt.widgets.TabFolder;
import org.eclipse.swt.widgets.TabItem;
import org.eclipse.swt.widgets.Table;

import tern.eclipse.ide.core.IIDETernProject;
import tern.eclipse.ide.core.TernCorePlugin;
import tern.eclipse.ide.internal.ui.TernUIMessages;
import tern.eclipse.ide.internal.ui.Trace;
import tern.eclipse.ide.internal.ui.controls.DependenciesPanel;
import tern.eclipse.ide.internal.ui.controls.DetailsPanel;
import tern.eclipse.ide.internal.ui.controls.OptionsPanel;
import tern.eclipse.ide.internal.ui.properties.AbstractTableBlock;
import tern.eclipse.ide.internal.ui.viewers.TernModuleVersionEditingSupport;
import tern.eclipse.ide.ui.TernUIPlugin;
import tern.eclipse.ide.ui.viewers.TernModuleLabelProvider;
import tern.metadata.TernModuleMetadata;
import tern.server.ITernModule;
import tern.utils.TernModuleHelper;

/**
 * Block to select Tern plugins + JSON Type Definitions.
 * 
 */
public class TernModulesBlock extends AbstractTableBlock {

	private final String tableLabel;
	private final IProject project;

	private final Map<String, ITernModule> ternModules = new HashMap<String, ITernModule>();
	private Object[] oldCheckedModules;
	private Object[] curCheckedModules;
	private CheckboxTableViewer tableViewer;
	private DetailsPanel detailsPanel;
	private DependenciesPanel dependenciesPanel;
	private OptionsPanel optionsPanel;
	private TabItem optionsTabItem;
	private TabFolder tabFolder;
	private TabItem detailsTabItem;
	//private Button selectDependenciesCheckbox;

	public TernModulesBlock(IProject project, String tableLabel) {
		this.project = project;
		this.tableLabel = tableLabel;
	}

	public Control createControl(Composite ancestor) {

		Composite parent = new Composite(ancestor, SWT.NULL);
		GridLayout layout = new GridLayout();
		layout.numColumns = 1;
		layout.marginHeight = 0;
		layout.marginWidth = 0;
		parent.setLayout(layout);
		Font font = ancestor.getFont();
		parent.setFont(font);

		GridData data;
		if (tableLabel != null) {
			Composite header = new Composite(parent, SWT.NONE);
			data = new GridData(SWT.FILL, SWT.CENTER, true, false, 2, 1);
			header.setLayoutData(data);
			layout = new GridLayout(2, false);
			layout.marginHeight = 0;
			layout.marginWidth = 0;
			header.setLayout(layout);

			// Create description
			Label tableLabel = new Label(header, SWT.WRAP);
			tableLabel.setText(this.tableLabel);
			data = new GridData(SWT.FILL, SWT.CENTER, true, false);
			data.widthHint = 200;
			tableLabel.setLayoutData(data);
			tableLabel.setFont(font);
		}

		SashForm sashForm = new SashForm(parent, SWT.HORIZONTAL | SWT.SMOOTH);
		data = new GridData(SWT.FILL, SWT.FILL, true, true);
		sashForm.setLayoutData(data);

		createModulesMaster(sashForm);
		createModulesDetails(sashForm);

		Dialog.applyDialogFont(parent);
		return parent;
	}

	/**
	 * Create table of tern modules.
	 * 
	 * @param ancestor
	 */
	private void createModulesMaster(Composite ancestor) {
		Composite parent = new Composite(ancestor, SWT.NULL);
		GridLayout layout = new GridLayout();
		layout.numColumns = 2;
		layout.marginHeight = 0;
		layout.marginWidth = 0;
		parent.setLayout(layout);
		Font font = ancestor.getFont();
		parent.setFont(font);

		Table table = new Table(parent, SWT.CHECK | SWT.BORDER
				| SWT.FULL_SELECTION | SWT.V_SCROLL);

		GridData data = new GridData(GridData.FILL_BOTH);
		data.widthHint = 350;
		data.heightHint = 300;
		table.setLayoutData(data);
		table.setFont(parent.getFont());

		table.setHeaderVisible(true);
		table.setLinesVisible(true);

		tableViewer = new CheckboxTableViewer(table);

		// create name column
		TableViewerColumn nameColumn = new TableViewerColumn(tableViewer,
				SWT.NONE);
		nameColumn.getColumn().setWidth(180);
		nameColumn.getColumn().setResizable(true);
		nameColumn.getColumn().setText(
				TernUIMessages.TernModulesBlock_moduleName);
		nameColumn.getColumn().addSelectionListener(new SelectionAdapter() {
			@Override
			public void widgetSelected(SelectionEvent e) {
				sortByName();
			}
		});

		// create version column
		TableViewerColumn versionColumn = new TableViewerColumn(tableViewer,
				SWT.NONE);
		versionColumn.getColumn().setWidth(100);
		versionColumn.getColumn().setResizable(true);
		versionColumn.getColumn().setText(
				TernUIMessages.TernModulesBlock_moduleVersion);
		versionColumn.setEditingSupport(new TernModuleVersionEditingSupport(
				tableViewer));

		tableViewer.setLabelProvider(TernModuleLabelProvider.getInstance());
		tableViewer.setContentProvider(ArrayContentProvider.getInstance());

		// when a module is checked and dependencies checkbox is checked, tern
		// module dependencies must be selected too
		tableViewer.addCheckStateListener(new ICheckStateListener() {

			private boolean checkUpdating;

			@Override
			public void checkStateChanged(CheckStateChangedEvent e) {
				if (checkUpdating) {
					return;
				}
				try {
					checkUpdating = true;
					if (e.getChecked() && isSelectDependencies()) {
						ITernModule module = ((ITernModule) e.getElement());
						TernModuleMetadata metadata = module.getMetadata();
						if (metadata != null) {
							ITernModule dependencyModule = null;
							// loop for each dependencies and check it if needed
							for (String moduleName : metadata.getDependencies()) {
								dependencyModule = ternModules.get(moduleName);
								if (dependencyModule != null) {
									if (!tableViewer
											.getChecked(dependencyModule)) {
										tableViewer.setChecked(
												dependencyModule, true);
									}
								}
							}
						}
					}
					storeCheckedElements();
				} finally {
					checkUpdating = false;
				}
			}
		});

		// when a module is selected, details, dependencies, options tabs must
		// be
		// refreshed.
		addSelectionChangedListener(new ISelectionChangedListener() {

			@Override
			public void selectionChanged(SelectionChangedEvent e) {
				if (!e.getSelection().isEmpty()) {
					ITernModule module = (ITernModule) ((IStructuredSelection) e
							.getSelection()).getFirstElement();
					refreshModule(module);
				} else {
					refreshModule(null);
				}
			}
		});
		restoreColumnSettings();
	}

	private void createModulesDetails(Composite parent) {

		// Create tab folder.
		tabFolder = new TabFolder(parent, SWT.NONE);
		GridData data = new GridData(GridData.FILL_HORIZONTAL);
		data.heightHint = 80;
		data.widthHint = 200;
		tabFolder.setLayoutData(data);

		// create details tab
		this.detailsPanel = new DetailsPanel(tabFolder, project);
		detailsTabItem = new TabItem(tabFolder, SWT.NULL);
		detailsTabItem.setControl(this.detailsPanel);
		detailsTabItem.setText(TernUIMessages.TernModulesBlock_detailsTabLabel);

		// create dependencies tab
		this.dependenciesPanel = new DependenciesPanel(tabFolder, project);
		TabItem dependenciesTabItem = new TabItem(tabFolder, SWT.NULL);
		dependenciesTabItem.setControl(this.dependenciesPanel);
		dependenciesTabItem
				.setText(TernUIMessages.TernModulesBlock_dependenciesTabLabel);

		// create options panel.
		this.optionsPanel = new OptionsPanel(tabFolder, project);
	}

	/**
	 * Refresh tab items with the given module information
	 * 
	 * @param module
	 */
	private void refreshModule(ITernModule module) {
		if (TernModuleHelper.hasOptions(module)) {
			// module has options, create options tab if needed
			if (optionsTabItem == null) {
				this.optionsTabItem = new TabItem(tabFolder, SWT.NULL);
				optionsTabItem.setControl(this.optionsPanel);
				optionsTabItem
						.setText(TernUIMessages.TernModulesBlock_optionsTabLabel);
			}
			optionsPanel.refresh(module);

		} else {
			// module has no options, don't display options tab
			if (optionsTabItem != null) {
				optionsTabItem.dispose();
			}
			optionsTabItem = null;
		}

		detailsPanel.refresh(module);
		dependenciesPanel.refresh(module);
		// select the details tab.
		tabFolder.setSelection(detailsTabItem);
	}

	public void addSelectionChangedListener(ISelectionChangedListener listener) {
		tableViewer.addSelectionChangedListener(listener);
	}

	public void removeSelectionChangedListener(
			ISelectionChangedListener listener) {
		tableViewer.removeSelectionChangedListener(listener);
	}

	/**
	 * Sorts by name.
	 */
	private void sortByName() {
		tableViewer.setSorter(new ViewerSorter() {
			@Override
			public int compare(Viewer viewer, Object e1, Object e2) {
				if ((e1 instanceof ITernModule) && (e2 instanceof ITernModule)) {
					ITernModule left = (ITernModule) e1;
					ITernModule right = (ITernModule) e2;
					return left.getName().compareToIgnoreCase(right.getName());
				}
				return super.compare(viewer, e1, e2);
			}

			@Override
			public boolean isSorterProperty(Object element, String property) {
				return true;
			}
		});
	}

	protected void setTernModules(ITernModule[] vms) {
		ternModules.clear();
		for (ITernModule module : vms) {
			ternModules.put(module.getType(), module);
		}
		tableViewer.setInput(ternModules.values());
	}
	
	public boolean isModified() {
		return !Arrays.equals(getCheckedModules(), oldCheckedModules);
	}
	
	public boolean isDisposed() {
		return tableViewer.getTable().isDisposed();
	}

	private void storeCheckedElements() {
		curCheckedModules = tableViewer.getCheckedElements();
	}

	public Object[] getCheckedModules() {
		return curCheckedModules;
	}

	public void setCheckedModules(Object[] selectedModules) {
		tableViewer.setCheckedElements(selectedModules);
		storeCheckedElements();
		
		//create deep copy of selected elements for later comparisons
		selectedModules = getCheckedModules();
		oldCheckedModules = new Object[selectedModules.length];
		for (int i = 0; i < selectedModules.length; i++) {
			oldCheckedModules[i] = TernModuleHelper.clone((ITernModule)selectedModules[i]);
		}
		
		/*
		 * if (selectedModules == null) { setSelection(new
		 * StructuredSelection()); } else { setSelection(new
		 * StructuredSelection(selectedModules)); }
		 */
	}

	@Override
	protected void setSortColumn(int column) {
		switch (column) {
		case 1:
			sortByName();
			break;
		}
		super.setSortColumn(column);
	}

	@Override
	protected Table getTable() {
		return tableViewer.getTable();
	}

	@Override
	protected IDialogSettings getDialogSettings() {
		return TernUIPlugin.getDefault().getDialogSettings();
	}

	@Override
	protected String getQualifier() {
		return TernUIPlugin.PLUGIN_ID + ".modules.";
	}

	/**
	 * Load plugins from tern project.
	 */
	public void loadModules() {
		try {
			List<ITernModule> checkedModules = project != null ? new ArrayList<ITernModule>()
					: null;
			IIDETernProject ternProject = getTernProject();
			// Load list of Tern Plugins + JSON Type Definitions.
			ITernModule[] allModules = TernCorePlugin
					.getTernServerTypeManager().getTernModules(ternProject,
							checkedModules);
			this.setTernModules(allModules);
			if (checkedModules != null) {
				this.setCheckedModules(checkedModules.toArray());
				/*
				 * if (checkedModules.size() > 0) { ITernModule firstModule =
				 * checkedModules.get(0); tableViewer.setSelection(new
				 * StructuredSelection( firstModule)); }
				 */
			}

		} catch (Throwable e) {
			Trace.trace(Trace.SEVERE, "Error while loading plugins.", e);
		}
	}

	/**
	 * Returns true if tern modules dependencies must be select when a tern
	 * module is selected and false otherwise.
	 * 
	 * @return true if tern modules dependencies must be select when a tern
	 *         module is selected and false otherwise.
	 */
	private boolean isSelectDependencies() {
		return true;
	}

	/**
	 * Returns the tern project and null otherwise.
	 * 
	 * @return the tern project and null otherwise.
	 * 
	 * @throws CoreException
	 */
	public IIDETernProject getTernProject() throws CoreException {
		return project != null && TernCorePlugin.hasTernNature(project) ? 
					TernCorePlugin.getTernProject(project) : null;
	}

	/**
	 * Returns the eclipse project and null otherwise.
	 * 
	 * @return the eclipse project and null otherwise.
	 */
	public IProject getProject() {
		return project;
	}
}
