/*
 * Copyright 2015, Genuitec, LLC
 * All Rights Reserved.
 */
package tern.eclipse.ide.internal.ui.preferences;

import org.eclipse.jface.preference.IPreferenceStore;
import org.eclipse.jface.preference.ScaleFieldEditor;
import org.eclipse.swt.SWT;
import org.eclipse.swt.events.SelectionAdapter;
import org.eclipse.swt.events.SelectionEvent;
import org.eclipse.swt.layout.GridData;
import org.eclipse.swt.layout.GridLayout;
import org.eclipse.swt.widgets.Composite;
import org.eclipse.swt.widgets.Label;
import org.eclipse.swt.widgets.Scale;

import com.genuitec.eclipse.core.util.PlatformUtil;

import tern.TernResourcesManager;
import tern.eclipse.ide.core.IIDETernProject;
import tern.eclipse.ide.core.preferences.TernCorePreferenceConstants;

public class QualityLevelFieldEditor extends ScaleFieldEditor {
	
	private Composite description;
	private IIDETernProject project;
	
	public QualityLevelFieldEditor(Composite parent, IIDETernProject project) {
		super(TernCorePreferenceConstants.QUALITY_LEVEL, 
				"Performance vs quality:", 
				parent, 0, 5, 1, 1);
		this.project = project;
	}
		
	private Composite getDescriptionComposite(Composite parent) {
		if (description == null) {
			new Label(parent, SWT.NONE).setLayoutData(new GridData(SWT.FILL, SWT.FILL, false, false));
			
			description = new Composite(parent, SWT.NONE);
			description.setLayout(new GridLayout(2, true));
			
			Label l = new Label(description, SWT.NONE);
			l.setText("performance");
			l.setLayoutData(new GridData(SWT.LEFT, SWT.TOP, true, false));
			
			l = new Label(description, SWT.NONE);
			l.setText("quality");
			l.setLayoutData(new GridData(SWT.RIGHT, SWT.TOP, true, false));
		} else {
			checkParent(description, parent);
		}
		return description;
	}
	
	@Override
	protected void doFillIntoGrid(Composite parent,
			int numColumns) {
		Scale scale = getScaleControl();
		
		super.doFillIntoGrid(parent, numColumns);
		
		//customize scale control if required
		if (scale == null && PlatformUtil.isLinuxPlatform()) {
			//Scale is smooth on GTK3, fix it
			getScaleControl().addSelectionListener(new SelectionAdapter() {
				boolean fixing = false;
				@Override
				public void widgetSelected(SelectionEvent e) {
					if (fixing) {
						return;
					}
					fixing = true;
					try {
						((Scale)e.widget).setSelection(((Scale)e.widget).getSelection());
					} finally{
						fixing = false;
					}
				}
			});
		}

		getDescriptionComposite(parent).setLayoutData(
				new GridData(SWT.FILL, SWT.TOP, true, false, numColumns - 1, 1));
		
	}
	
	@Override
	protected void doStore() {
		boolean changed = getPreferenceStore().getInt(
				TernCorePreferenceConstants.QUALITY_LEVEL) != getScaleControl().getSelection();
		super.doStore();
		if (changed) {
			if (project != null) {
				project.disposeServer();
			} else {
				TernResourcesManager.disposeAllServers();
			}
		}
	}
	
	@Override
	public void setPreferenceStore(IPreferenceStore store) {
		super.setPreferenceStore(store);
		if (store != null) {
			//set default value in case it's not set already
	        store.setDefault(TernCorePreferenceConstants.QUALITY_LEVEL, 
	        		TernCorePreferenceConstants.DEFAULT_QUALITY_LEVEL);
		}
	}
}
