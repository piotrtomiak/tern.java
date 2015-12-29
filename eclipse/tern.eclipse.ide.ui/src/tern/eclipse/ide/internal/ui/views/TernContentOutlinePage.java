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
package tern.eclipse.ide.internal.ui.views;

import org.eclipse.core.resources.IFile;
import org.eclipse.core.runtime.IAdaptable;
import org.eclipse.jface.viewers.DoubleClickEvent;
import org.eclipse.jface.viewers.IDoubleClickListener;
import org.eclipse.jface.viewers.ISelection;
import org.eclipse.jface.viewers.ISelectionChangedListener;
import org.eclipse.jface.viewers.IStructuredSelection;
import org.eclipse.jface.viewers.TreeViewer;
import org.eclipse.swt.SWT;
import org.eclipse.swt.widgets.Composite;
import org.eclipse.swt.widgets.Control;
import org.eclipse.ui.navigator.CommonViewer;
import org.eclipse.ui.part.Page;
import org.eclipse.ui.views.contentoutline.IContentOutlinePage;

import tern.ITernFile;
import tern.ITernProject;
import tern.eclipse.ide.ui.TernUIPlugin;
import tern.eclipse.ide.ui.utils.EditorUtils;
import tern.server.protocol.outline.IJSNode;

public class TernContentOutlinePage extends Page implements IContentOutlinePage {

	private final ITernFile ternFile;
	private final ITernProject ternProject;
	private CommonViewer viewer;

	public TernContentOutlinePage(ITernFile ternFile, ITernProject project) {
		this.ternFile = ternFile;
		this.ternProject = project;
	}

	@Override
	public void addSelectionChangedListener(ISelectionChangedListener listener) {
		this.viewer.addSelectionChangedListener(listener);
	}

	@Override
	public ISelection getSelection() {
		return this.viewer.getSelection();
	}

	@Override
	public void removeSelectionChangedListener(ISelectionChangedListener listener) {
		this.viewer.removePostSelectionChangedListener(listener);
	}

	@Override
	public void setSelection(ISelection selection) {
		this.viewer.setSelection(selection);
	}

	@Override
	public Control getControl() {
		return this.viewer.getControl();
	}

	@Override
	public void setFocus() {
		getControl().setFocus();
	}

	@Override
	public void createControl(Composite parent) {
		viewer = new CommonViewer(TernUIPlugin.PLUGIN_ID + ".outline", parent, SWT.MULTI);
		viewer.addDoubleClickListener(new IDoubleClickListener() {
			@Override
			public void doubleClick(DoubleClickEvent event) {
				IStructuredSelection selection = (IStructuredSelection) event.getSelection();
				if (!selection.isEmpty()) {
					if (selection.getFirstElement() instanceof IJSNode) {
						IJSNode node = (IJSNode) selection.getFirstElement();
						EditorUtils.openInEditor(node, (IFile)ternFile.getAdapter(IFile.class));
					}
				}
			}
		});
		viewer.setAutoExpandLevel(TreeViewer.ALL_LEVELS);
		viewer.setInput(new IAdaptable() {
			@Override
			public Object getAdapter(Class adapter) {
				if (adapter == ITernFile.class) {
					return ternFile;
				}
				if (adapter == ITernProject.class) {
					return ternProject;
				}
				return null;
			}
		});
	}

}
