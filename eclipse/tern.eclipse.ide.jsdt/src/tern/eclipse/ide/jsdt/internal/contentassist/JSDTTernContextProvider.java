/*
 * Copyright 2015, Genuitec, LLC
 * All Rights Reserved.
 */
package tern.eclipse.ide.jsdt.internal.contentassist;

import org.eclipse.core.resources.IFile;
import org.eclipse.core.resources.IProject;
import org.eclipse.core.resources.IResource;
import org.eclipse.jface.text.IDocument;
import org.eclipse.wst.jsdt.ui.text.java.JavaContentAssistInvocationContext;
import org.eclipse.wst.sse.ui.contentassist.CompletionProposalInvocationContext;

import tern.ITernFile;
import tern.ITernProject;
import tern.TernResourcesManager;
import tern.eclipse.ide.core.resources.TernDocumentFile;
import tern.eclipse.ide.jsdt.internal.utils.DOMUtils;

public class JSDTTernContextProvider implements ITernContextProvider {

	@Override
	public TernContext getTernContext(
			JavaContentAssistInvocationContext javaContext) {

		IProject project = javaContext.getProject().getProject();
		ITernProject ternProject = TernResourcesManager.getTernProject(project);
		
		if (ternProject != null) {

			IDocument document = javaContext.getDocument();
			IResource resource = javaContext.getCompilationUnit()
					.getResource();
			if (resource.getType() == IResource.FILE) {
				IFile scriptFile = (IFile) resource;

				ITernFile tf = new TernDocumentFile(scriptFile, document);
				return new TernContext(ternProject, tf);
			}
		}
		return null;
	}

	@Override
	public TernContext getTernContext(
			CompletionProposalInvocationContext htmlContext) {
		IFile file = DOMUtils.getFile(htmlContext.getDocument());
		if (file != null) {
			IProject project = file.getProject();
			ITernProject ternProject = TernResourcesManager.getTernProject(project);
			if (ternProject != null) {
				IDocument document = htmlContext.getDocument();
				ITernFile tf = new TernDocumentFile(file, document);
				return new TernContext(ternProject, tf);
			}
		}
		return null;
	}
	
	
}
