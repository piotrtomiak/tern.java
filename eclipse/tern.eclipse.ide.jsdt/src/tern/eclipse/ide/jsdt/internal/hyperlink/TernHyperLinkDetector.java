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
package tern.eclipse.ide.jsdt.internal.hyperlink;

import java.util.ArrayList;
import java.util.List;

import org.eclipse.core.resources.IFile;
import org.eclipse.core.resources.IProject;
import org.eclipse.core.resources.IResource;
import org.eclipse.core.resources.ResourcesPlugin;
import org.eclipse.core.runtime.CoreException;
import org.eclipse.core.runtime.IPath;
import org.eclipse.jface.text.BadLocationException;
import org.eclipse.jface.text.IDocument;
import org.eclipse.jface.text.IRegion;
import org.eclipse.jface.text.ITextViewer;
import org.eclipse.jface.text.Region;
import org.eclipse.jface.text.hyperlink.AbstractHyperlinkDetector;
import org.eclipse.jface.text.hyperlink.IHyperlink;
import org.eclipse.ui.texteditor.ITextEditor;
import org.eclipse.wst.jsdt.core.IClassFile;
import org.eclipse.wst.jsdt.core.IField;
import org.eclipse.wst.jsdt.core.IFunction;
import org.eclipse.wst.jsdt.core.IJavaScriptElement;
import org.eclipse.wst.jsdt.core.IJavaScriptUnit;
import org.eclipse.wst.jsdt.core.ILocalVariable;
import org.eclipse.wst.jsdt.core.ISourceRange;
import org.eclipse.wst.jsdt.core.ISourceReference;
import org.eclipse.wst.jsdt.core.JavaScriptModelException;
import org.eclipse.wst.jsdt.internal.core.JavaElement;
import org.eclipse.wst.jsdt.web.core.javascript.IJsTranslation;
import org.eclipse.wst.jsdt.web.core.javascript.JsTranslationAdapter;
import org.eclipse.wst.jsdt.web.ui.internal.Logger;
import org.eclipse.wst.jsdt.web.ui.internal.hyperlink.ExternalFileHyperlink;
import org.eclipse.wst.jsdt.web.ui.internal.hyperlink.JSDTHyperlink;
import org.eclipse.wst.sse.core.StructuredModelManager;
import org.eclipse.wst.sse.core.internal.provisional.IStructuredModel;
import org.eclipse.wst.xml.core.internal.provisional.document.IDOMDocument;
import org.eclipse.wst.xml.core.internal.provisional.document.IDOMModel;
import org.eclipse.wst.xml.ui.internal.hyperlink.WorkspaceFileHyperlink;

import tern.eclipse.ide.core.IIDETernProject;
import tern.eclipse.ide.core.TernCorePlugin;
import tern.eclipse.ide.internal.ui.Trace;
import tern.eclipse.ide.ui.utils.EditorUtils;

/**
 * Tern Hyperlink detector.
 *
 */
public class TernHyperLinkDetector extends AbstractHyperlinkDetector {

	private IHyperlink createHyperlink(IJsTranslation jsTranslation, IJavaScriptElement element, IRegion region,
			IDocument document) {
		IHyperlink link = null;
		if (region != null) {
			// open local variable in the JSP file...
			if (element instanceof ISourceReference) {
				IFile file = null;
				IPath outsidePath = null;
				int jspOffset = 0;
				IStructuredModel sModel = null;
				// try to locate the file in the workspace
				try {
					sModel = StructuredModelManager.getModelManager().getExistingModelForRead(document);
					if (sModel != null) {
						// URIResolver resolver = sModel.getResolver();
						// if (resolver != null) {
						// String uriString = resolver.getFileBaseLocation();
						String uriString = sModel.getBaseLocation();
						file = getFile(uriString);
						// }
					}
				} finally {
					if (sModel != null) {
						sModel.releaseFromRead();
					}
				}
				// get Java range, translate coordinate to JSP
				try {
					ISourceRange range = null;
					if (jsTranslation != null) {
						// link to local variable definitions
						if (element instanceof ILocalVariable) {
							range = ((ILocalVariable) element).getNameRange();
							IJavaScriptElement unit = ((ILocalVariable) element).getParent();
							IJavaScriptUnit myUnit = jsTranslation.getCompilationUnit();

							while (!(unit instanceof IJavaScriptUnit || unit instanceof IClassFile || unit == null)) {
								unit = ((JavaElement) unit).getParent();
							}
							if (unit instanceof IJavaScriptUnit) {
								IJavaScriptUnit cu = (IJavaScriptUnit) unit;
								if (cu != myUnit) {
									file = getFile(cu.getPath().toString());
									if (file == null) {
										outsidePath = cu.getPath();
									}
								}
							} else if (unit instanceof IClassFile) {
								IClassFile cu = (IClassFile) unit;
								if (cu != myUnit) {
									file = getFile(cu.getPath().toString());
									if (file == null) {
										outsidePath = cu.getPath();
									}
								}
							}

						}
						// linking to fields of the same compilation unit
						else if (element.getElementType() == IJavaScriptElement.FIELD) {
							Object cu = ((IField) element).getJavaScriptUnit();
							if (cu != null && cu.equals(jsTranslation.getCompilationUnit())) {
								range = ((ISourceReference) element).getSourceRange();
							}
						}
						// linking to methods of the same compilation unit
						else if (element.getElementType() == IJavaScriptElement.METHOD) {
							Object cu = ((IFunction) element).getJavaScriptUnit();
							if (cu != null && cu.equals(jsTranslation.getCompilationUnit())) {
								range = ((IFunction) element).getNameRange();
							}
						}
					}
					if (range != null && file != null) {
						jspOffset = range.getOffset();
						if (jspOffset >= 0) {
							link = new WorkspaceFileHyperlink(region, file, new Region(jspOffset, range.getLength()));
						}
					} else if (range != null && outsidePath != null) {
						jspOffset = range.getOffset();
						if (jspOffset >= 0) {
							link = new ExternalFileHyperlink(region, outsidePath.toFile());
						}
					}
				} catch (JavaScriptModelException jme) {
					Logger.log(Logger.WARNING_DEBUG, jme.getMessage(), jme);
				}
			}
			if (link == null) {
				link = new JSDTHyperlink(region, element);
			}
		}
		return link;
	}

	/*
	 * (non-Javadoc)
	 * 
	 * @see
	 * org.eclipse.jface.text.hyperlink.IHyperlinkDetector#detectHyperlinks(
	 * org.eclipse.jface.text.ITextViewer, org.eclipse.jface.text.IRegion,
	 * boolean)
	 */
	public IHyperlink[] detectHyperlinks(ITextViewer textViewer, IRegion region, boolean canShowMultipleHyperlinks) {
		List<IHyperlink> hyperlinks = new ArrayList<IHyperlink>();
		if (region != null && textViewer != null) {
			IDocument document = textViewer.getDocument();
			IJsTranslation jsTranslation = getJsTranslation(document);
			if (jsTranslation != null) {
				// find hyperlink range for JavaScript elements
				IRegion hyperlinkRegion = selectWord(document, region.getOffset());
				IJavaScriptElement[] elements = jsTranslation.getElementsFromJsRange(
						jsTranslation.getJavaScriptOffset(region.getOffset()),
						jsTranslation.getJavaScriptOffset(region.getOffset() + region.getLength()));
				if (elements != null && elements.length > 0) {
					// create a hyperlink for each JavaScript element
					for (int i = 0; i < elements.length; ++i) {
						IJavaScriptElement element = elements[i];
						IHyperlink link = createHyperlink(jsTranslation, element, hyperlinkRegion, document);
						if (link != null) {
							hyperlinks.add(link);
						}
					}
				}
			}
		}
		if (hyperlinks.size() == 0) {
			IResource resource = getResource(textViewer);
			if (resource == null) {
				return null;
			}
			IProject project = resource.getProject();
			if (TernCorePlugin.hasTernNature(project)) {
				try {
					IIDETernProject ternProject = TernCorePlugin.getTernProject(project);

					IDocument document = textViewer.getDocument();
					TernHyperlink hyperlink = new TernHyperlink(document, region, resource, ternProject);
					hyperlinks.add(hyperlink);

				} catch (CoreException e) {
					Trace.trace(Trace.WARNING, "Error while tern hyperlink", e);
				}
			}
		}
		return hyperlinks.toArray(new IHyperlink[hyperlinks.size()]);
	}

	/**
	 * Returns an IFile from the given uri if possible, null if cannot find file
	 * from uri.
	 * 
	 * @param fileString
	 *            file system path
	 * @return returns IFile if fileString exists in the workspace
	 */
	private IFile getFile(String fileString) {
		IFile file = null;
		if (fileString != null) {
			IResource resource = ResourcesPlugin.getWorkspace().getRoot().findMember(fileString);
			if (resource != null && resource instanceof IFile) {
				file = (IFile) resource;
			}
		}
		return file;
	}

	/**
	 * Get JSP translation object
	 * 
	 * @return JSPTranslation if one exists, null otherwise
	 */
	private IJsTranslation getJsTranslation(IDocument document) {
		IJsTranslation translation = null;
		IDOMModel xmlModel = null;
		try {
			xmlModel = (IDOMModel) StructuredModelManager.getModelManager().getExistingModelForRead(document);
			if (xmlModel != null) {
				IDOMDocument xmlDoc = xmlModel.getDocument();
				JsTranslationAdapter adapter = (JsTranslationAdapter) xmlDoc.getAdapterFor(IJsTranslation.class);
				if (adapter != null) {
					translation = adapter.getJsTranslation(true);
				}
			}
		} finally {
			if (xmlModel != null) {
				xmlModel.releaseFromRead();
			}
		}
		return translation;
	}

	/**
	 * Java always selects word when defining region
	 * 
	 * @param document
	 * @param anchor
	 * @return IRegion
	 */
	private IRegion selectWord(IDocument document, int anchor) {
		try {
			int offset = anchor;
			char c;
			while (offset >= 0) {
				c = document.getChar(offset);
				if (!Character.isJavaIdentifierPart(c)) {
					break;
				}
				--offset;
			}
			int start = offset;
			offset = anchor;
			int length = document.getLength();
			while (offset < length) {
				c = document.getChar(offset);
				if (!Character.isJavaIdentifierPart(c)) {
					break;
				}
				++offset;
			}
			int end = offset;
			if (start == end) {
				return new Region(start, 0);
			}
			return new Region(start + 1, end - start - 1);
		} catch (BadLocationException x) {
			return null;
		}
	}

	protected IResource getResource(ITextViewer textViewer) {
		ITextEditor textEditor = (ITextEditor) getAdapter(ITextEditor.class);
		IResource res = textEditor != null ? EditorUtils.getResource(textEditor) : null;
		if (res == null) {
			IDOMModel xmlModel = null;
			try {
				xmlModel = (IDOMModel) StructuredModelManager.getModelManager().getExistingModelForRead(
						textViewer.getDocument());
				if (xmlModel != null) {
					res = (IResource) xmlModel.getAdapter(IResource.class);
				}
			} finally {
				if (xmlModel != null) {
					xmlModel.releaseFromRead();
				}
			}
		}
		return res;
	}
}
