/**
 *  Copyright (c) 2013-2015 Angelo ZERR, and others
 *  All rights reserved. This program and the accompanying materials
 *  are made available under the terms of the Eclipse Public License v1.0
 *  which accompanies this distribution, and is available at
 *  http://www.eclipse.org/legal/epl-v10.html
 *
 *  Contributors:
 *  Angelo Zerr <angelo.zerr@gmail.com> - initial API and implementation
 *  Mickael Istria (Red Hat Inc.) - reduce coupling to TernOutlineView
 */
package tern.eclipse.ide.internal.ui.views;

import java.util.ArrayList;
import java.util.List;

import org.eclipse.core.runtime.IAdaptable;
import org.eclipse.core.runtime.IProgressMonitor;
import org.eclipse.core.runtime.IStatus;
import org.eclipse.core.runtime.Status;
import org.eclipse.core.runtime.jobs.Job;
import org.eclipse.jface.text.DocumentEvent;
import org.eclipse.jface.text.IDocument;
import org.eclipse.jface.text.IDocumentListener;
import org.eclipse.jface.viewers.ITreeContentProvider;
import org.eclipse.jface.viewers.TreePath;
import org.eclipse.jface.viewers.TreeViewer;
import org.eclipse.jface.viewers.Viewer;
import org.eclipse.swt.widgets.Control;
import org.eclipse.swt.widgets.Display;

import tern.ITernFile;
import tern.ITernProject;
import tern.eclipse.ide.internal.ui.TernUIMessages;
import tern.server.TernPlugin;
import tern.server.protocol.outline.IJSNode;
import tern.server.protocol.outline.JSNodeRoot;
import tern.server.protocol.outline.TernOutlineQuery;

public class TernOutlineContentProvider implements ITreeContentProvider, IDocumentListener {

	public static final Object COMPUTING_NODE = new Object();
	private static final Object[] EMPTY_ARRAY = new Object[0];
	private static final int UPDATE_DELAY = 500;
	
	private Viewer viewer;
	private IAdaptable input;
	private IDocument document;
	private ITernFile ternFile;
	private ITernProject ternProject;
	private Job refreshJob;
	private boolean parsed = false;
	private TernOutline outline = null;
	
	public TernOutlineContentProvider() {
		this.refreshJob = new Job(TernUIMessages.refreshOutline) {
			@Override
			protected IStatus run(IProgressMonitor monitor) {
				parsed = false;
				if (input == null) {
					return Status.OK_STATUS;
				}
				try {
					if (ternProject != null && ternProject.hasPlugin(TernPlugin.outline)) {
						// Call tern-outline
						TernOutlineQuery query = new TernOutlineQuery(ternFile.getFileName());
						outline = new TernOutline(ternFile, ternProject);
						ternProject.request(query, ternFile, outline);
						parsed = true;
						Display.getDefault().syncExec(new Runnable() {
							@Override
							public void run() {
								Control refreshControl = viewer.getControl();
								if ((refreshControl != null) && !refreshControl.isDisposed()) {
									TreePath[] expendedPaths = null;
									if (viewer instanceof TreeViewer) {
										 expendedPaths = ((TreeViewer)viewer).getExpandedTreePaths();
									}
									viewer.refresh();
									if (viewer instanceof TreeViewer && expendedPaths != null) {
										((TreeViewer)viewer).setExpandedTreePaths(toNewTreePaths(expendedPaths, outline.getRoot()));
									}
								}
							}
						});
					}
				} catch (Exception e) {
					e.printStackTrace();
				}
				return Status.OK_STATUS;
			}
		};
		refreshJob.setSystem(true);
		refreshJob.setPriority(Job.SHORT);
	}
	
	private TreePath[] toNewTreePaths(TreePath[] originExpandedPaths, IJSNode newRoot) {
		List<TreePath> res = new ArrayList<TreePath>();
		for (TreePath originExpanded : originExpandedPaths) {
			int i = 0;
			List<Object> newPathItems = new ArrayList<Object>();
			IJSNode previousJSNode = null;
			while (i < originExpanded.getSegmentCount()) {
				Object originSegment = originExpanded.getSegment(i);
				if (originSegment instanceof IJSNode) {
					IJSNode originNode = (IJSNode)originSegment;
					IJSNode matchingNode = null;
					if (previousJSNode == null) {
						if (originNode instanceof JSNodeRoot) {
							matchingNode = newRoot;
						} else {
							matchingNode = findSimilarChild(newRoot, originNode);
						}
					} else {
						matchingNode = findSimilarChild(previousJSNode, originNode);
					}
					if (matchingNode != null) {
						newPathItems.add(matchingNode);
						previousJSNode = matchingNode;
					}
				} else {
					newPathItems.add(originSegment);
				}
				i++;
			}
			res.add(new TreePath(newPathItems.toArray()));
		}
		return res.toArray(new TreePath[res.size()]);
	}

	private IJSNode findSimilarChild(IJSNode newParentNode, IJSNode originChildNode) {
		IJSNode matchingNode = null;
		// First search node with same name
		if (originChildNode.getName() != null) {
			for (IJSNode child : newParentNode.getChildren()) {
				if (child.getName() != null && child.getName().equals(originChildNode.getName())) {
					matchingNode = child;
				}
			}
		}
		// If not found, fail back to index
		if (matchingNode == null) {
			matchingNode = newParentNode.getChildren().get(originChildNode.getParent().getChildren().indexOf(originChildNode));
		}
		return matchingNode;
	}
	

	@Override
	public Object[] getElements(Object element) {
		if (!parsed) {
			return new Object[] { COMPUTING_NODE };
		}
		return outline.getRoot().getChildren().toArray();
	}

	@Override
	public Object[] getChildren(Object element) {
		if (element instanceof IJSNode) {
			return ((IJSNode) element).getChildren().toArray();
		}
		return EMPTY_ARRAY;
	}

	@Override
	public Object getParent(Object element) {
		if (element instanceof IJSNode) {
			return ((IJSNode) element).getParent();
		}
		return null;
	}

	@Override
	public boolean hasChildren(Object element) {
		if (element instanceof IJSNode) {
			return ((IJSNode) element).hasChidren();
		}
		return false;
	}

	@Override
	public void dispose() {
		this.refreshJob.cancel();
		if (this.document != null) {
			document.removeDocumentListener(this);
			document = null;
		}
	}

	@Override
	public void inputChanged(Viewer viewer, Object oldInput, Object newInput) {
		this.viewer = viewer;
		if (this.document != null) {
			this.document.removeDocumentListener(this);
		}
		if (newInput instanceof IAdaptable) {
			this.input = (IAdaptable) newInput;
			this.ternFile = (ITernFile) input.getAdapter(ITernFile.class);
			this.ternProject = (ITernProject) input.getAdapter(ITernProject.class);
			this.document = (IDocument) ternFile.getAdapter(IDocument.class);
		} else {
			this.input = null;
			this.ternFile = null;
			this.ternProject = null;
			this.document = null;
		}
		if (this.document != null) {
			document.addDocumentListener(this);
		}
		this.refreshJob.schedule();
	}
	
	@Override
	public void documentChanged(DocumentEvent event) {
		if (this.refreshJob.getState() != Job.NONE) {
			this.refreshJob.cancel();
		}
		this.refreshJob.schedule(UPDATE_DELAY);
	}
	
	@Override
	public void documentAboutToBeChanged(DocumentEvent event) {
	}
	
}
