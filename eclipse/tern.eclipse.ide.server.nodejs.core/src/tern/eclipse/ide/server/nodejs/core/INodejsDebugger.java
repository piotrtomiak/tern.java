/*
 * Copyright 2015, Genuitec, LLC
 * All Rights Reserved.
 */
package tern.eclipse.ide.server.nodejs.core;

import java.io.File;

import org.eclipse.core.resources.IFile;

import tern.TernException;
import tern.server.nodejs.process.INodejsProcess;

public interface INodejsDebugger {

	String getName();

	String getId();

	boolean isInstalled();

	INodejsProcess createProcess(File projectDir, File nodejsBaseDir,
			IFile ternServerFile) throws TernException;

}
