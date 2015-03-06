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
package tern.eclipse.ide.internal.ui.properties;

import org.eclipse.core.resources.IProject;
import org.eclipse.core.resources.IResource;
import org.eclipse.core.resources.ProjectScope;
import org.eclipse.core.runtime.CoreException;
import org.eclipse.core.runtime.IAdaptable;
import org.eclipse.core.runtime.preferences.IScopeContext;
import org.eclipse.jface.preference.FieldEditorPreferencePage;
import org.eclipse.jface.preference.IPreferenceStore;
import org.eclipse.jface.preference.ScaleFieldEditor;
import org.eclipse.ui.IWorkbenchPropertyPage;
import org.eclipse.ui.preferences.ScopedPreferenceStore;

import tern.eclipse.ide.core.TernCorePlugin;
import tern.eclipse.ide.internal.ui.preferences.QualityLevelFieldEditor;
import tern.eclipse.ide.ui.ImageResource;
import tern.eclipse.ide.ui.TernUIPlugin;

/**
 * Tern Main page for project properties.
 * 
 */
public class TernMainPropertyPage extends FieldEditorPreferencePage implements
		IWorkbenchPropertyPage {

	private IAdaptable element;
	
	public static final String PROP_ID = "tern.eclipse.ide.internal.ui.properties.TernMainPropertyPage";

	public TernMainPropertyPage() {
		setImageDescriptor(ImageResource
				.getImageDescriptor(ImageResource.IMG_LOGO));
	}

	@Override
	protected IPreferenceStore doGetPreferenceStore() {
		IScopeContext context = new ProjectScope(getProject());
		return new ScopedPreferenceStore(context, 
				TernCorePlugin.getDefault().getBundle().getSymbolicName());
	}
	
	protected IProject getProject() {
		if (getElement() != null) {
			if (getElement() instanceof IProject) {
				return (IProject) getElement();
			}
			Object adapter = getElement().getAdapter(IProject.class);
			if (adapter instanceof IProject) {
				return (IProject) adapter;
			}
			adapter = getElement().getAdapter(IResource.class);
			if (adapter instanceof IProject) {
				return (IProject) adapter;
			}
		}
		return null;
	}

	@Override
	public IAdaptable getElement() {
		return element;
	}

	@Override
	public void setElement(IAdaptable element) {
		this.element = element;
	}

	@Override
	protected void createFieldEditors() {
		ScaleFieldEditor qualityLevelEditor;
		try {
			qualityLevelEditor = new QualityLevelFieldEditor(getFieldEditorParent(), 
					TernCorePlugin.getTernProject(getProject()));
			addField(qualityLevelEditor);
		} catch (CoreException e) {
			TernUIPlugin.getDefault().getLog().log(e.getStatus());
		}
	}

}
