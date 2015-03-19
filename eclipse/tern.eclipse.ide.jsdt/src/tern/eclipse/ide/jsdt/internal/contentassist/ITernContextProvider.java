/*
 * Copyright 2015, Genuitec, LLC
 * All Rights Reserved.
 */
package tern.eclipse.ide.jsdt.internal.contentassist;

import org.eclipse.wst.jsdt.ui.text.java.JavaContentAssistInvocationContext;
import org.eclipse.wst.sse.ui.contentassist.CompletionProposalInvocationContext;

import tern.ITernFile;
import tern.ITernProject;

public interface ITernContextProvider {

	TernContext getTernContext(JavaContentAssistInvocationContext javaContext);
	
	TernContext getTernContext(CompletionProposalInvocationContext htmlContext);
	
	public static final class TernContext {
		
		public final ITernFile file;
		
		public final ITernProject project;
		
		public TernContext(ITernProject project, ITernFile file) {
			this.project = project;
			this.file = file;
		}
		
	}
	
}
