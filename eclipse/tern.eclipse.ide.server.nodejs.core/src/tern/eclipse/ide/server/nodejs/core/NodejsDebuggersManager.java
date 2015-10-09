/*
 * Copyright 2015, Genuitec, LLC
 * All Rights Reserved.
 */
package tern.eclipse.ide.server.nodejs.core;

import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

import tern.eclipse.ide.server.nodejs.internal.core.debugging.webclipse.WebclipseDebugger;

public class NodejsDebuggersManager {

	private static Map<String, INodejsDebugger> debuggers = new LinkedHashMap<String, INodejsDebugger>();

	static {
		// Add supported debuggers
		addDebugger(new WebclipseDebugger());

		// Make debuggers map unmodifiable
		debuggers = Collections.unmodifiableMap(debuggers);
	}

	public static Collection<INodejsDebugger> getDebuggers() {
		return debuggers.values();
	}

	private static void addDebugger(INodejsDebugger debugger) {
		debuggers.put(debugger.getId(), debugger);
	}

	public static INodejsDebugger getDebugger(String debugger) {
		if (debugger == null) {
			return null;
		}
		return debuggers.get(debugger);
	}

}
