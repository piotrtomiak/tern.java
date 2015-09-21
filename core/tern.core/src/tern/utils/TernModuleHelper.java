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
package tern.utils;

import static tern.utils.ExtensionUtils.JSON_EXTENSION;
import static tern.utils.ExtensionUtils.JS_EXTENSION;
import static tern.utils.ExtensionUtils.TERN_SUFFIX;

import java.io.File;
import java.io.IOException;
import java.util.Comparator;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import tern.ITernProject;
import tern.TernException;
import tern.metadata.ModuleDependenciesComparator;
import tern.metadata.TernModuleMetadata;
import tern.server.BasicTernDef;
import tern.server.BasicTernPlugin;
import tern.server.ITernDef;
import tern.server.ITernModule;
import tern.server.ITernModuleConfigurable;
import tern.server.ITernPlugin;
import tern.server.ModuleType;
import tern.server.TernDef;
import tern.server.TernModuleConfigurable;
import tern.server.TernPlugin;

import com.eclipsesource.json.JsonObject;
import com.eclipsesource.json.JsonValue;

/**
 * Helper for {@link ITernModule}.
 *
 */
public class TernModuleHelper {

	public static final Comparator<String> MODULE_VERSION_COMPARATOR = new Comparator<String>() {
		
		@Override
		public int compare(String version1, String version2) {
			int[] v1 = parseVersion(version1);
			int[] v2 = parseVersion(version2);
			for (int i = 0; i < v1.length || i < v2.length; i++) {
				int a = i >= v1.length ? 0 : v1[i];
				int b = i >= v2.length ? 0 : v2[i];
				if (a > b) {
					return 1;
				} else if (a < b) {
					return -1;
				}
			}
			return 0;
		}
		
		private int[] parseVersion(String version) {
			String[] segments = version.split("\\."); //$NON-NLS-1$
			int[] result = new int[segments.length];
			for (int i = 0; i < result.length; i++) {
				try {
					result[i] = Integer.parseInt(segments[i]);
				} catch (Exception e) {
					//ignore - assume 0
				}
			}
			return result;
		}
	};
	
	/**
	 * Group the given list tern modules by {@link ITernModule#getType()}.
	 * 
	 * @param modules
	 * @param groupedModules
	 */
	public static List<ITernModule> groupByType(List<ITernModule> modules) {
		List<ITernModule> groupedModules = new ArrayList<ITernModule>();
		Map<String, TernModuleConfigurable> wrappers = null;
		for (ITernModule module : modules) {
			if (!isConfigurableModule(module)) {
				// module is not configurable, add it
				groupedModules.add(module);
			} else {
				// module is configurable (version can be customized, or
				// options), wrap it with TernModuleConfigurable
				if (wrappers == null) {
					wrappers = new HashMap<String, TernModuleConfigurable>();
				}
				TernModuleConfigurable wrapper = wrappers.get(module.getType());
				if (wrapper == null) {
					wrapper = new TernModuleConfigurable(module);
					wrappers.put(module.getType(), wrapper);
					groupedModules.add(wrapper);
				} else {
					wrapper.addModule(module);
					if (wrapper.getVersion() != null && 
							MODULE_VERSION_COMPARATOR.compare(wrapper.getVersion(), 
									module.getVersion()) < 0) {
						try {
							wrapper.setVersion(module.getVersion());
						} catch (TernException e) {
							//ignore, best effort
						}
					}
				}
			}
		}
		return groupedModules;
	}
	
	public static ITernModule clone(ITernModule module) {
		if (module instanceof TernModuleConfigurable) {
			return ((TernModuleConfigurable)module).clone();
		}
		return module;		
	}

	/**
	 * Returns true if the given module can be configured and false otherwise.
	 * 
	 * @param module
	 * @return true if the given module can be configured and false otherwise.
	 */
	public static boolean isConfigurableModule(ITernModule module) {
		TernModuleMetadata metadata = module.getMetadata();
		return !StringUtils.isEmpty(module.getVersion())
				|| (metadata != null && metadata.hasOptions());
	}

	/**
	 * Update the given list of {@link ITernDef} or {@link ITernPlugin} by using
	 * the given module.
	 * 
	 * @param module
	 * @param defs
	 *            to update.
	 * @param plugins
	 *            to update.
	 */
	public static void update(List<ITernDef> defs, List<ITernPlugin> plugins,
			ITernModule module) {
		update(defs, plugins, null, module);
	}

	/**
	 * Update the given list of {@link ITernDef} or {@link ITernPlugin} by using
	 * the given module.
	 * 
	 * @param module
	 * @param defs
	 *            to update.
	 * @param plugins
	 *            to update.
	 */
	private static void update(List<ITernDef> defs, List<ITernPlugin> plugins,
			JsonObject options, ITernModule module) {
		switch (module.getModuleType()) {
		case Def:
			defs.add((ITernDef) module);
			break;
		case Plugin:
			plugins.add((ITernPlugin) module);
			break;
		case Configurable:
			ITernModule wrappedModule = ((ITernModuleConfigurable) module)
					.getWrappedModule();
			JsonObject wrappedOptions = ((ITernModuleConfigurable) module)
					.getOptions();
			update(defs, plugins, wrappedOptions, wrappedModule);
			break;
		}
	}

	/**
	 * Update the given tern project by using the given module.
	 * 
	 * @param module
	 * @param ternProject
	 */
	public static void update(ITernModule module, ITernProject ternProject) {
		update(module, null, ternProject);
	}

	/**
	 * Update the given tern project by using the given module.
	 * 
	 * @param module
	 * @param ternProject
	 */
	public static void update(ITernModule module, JsonObject options,
			ITernProject ternProject) {
		switch (module.getModuleType()) {
		case Def:
			ternProject.addLib((ITernDef) module);
			break;
		case Plugin:
			ternProject.addPlugin((ITernPlugin) module, options);
			break;
		case Configurable:
			ITernModule wrappedModule = ((ITernModuleConfigurable) module)
					.getWrappedModule();
			JsonObject wrappedOptions = ((ITernModuleConfigurable) module)
					.getOptions();
			update(wrappedModule, wrappedOptions, ternProject);
			break;
		}
	}

	/**
	 * Retrieve {@link ITernModuleConfigurable} for the given module inside the
	 * list of modules.
	 * 
	 * @param module
	 * @param options
	 * @param allModules
	 * @return
	 * @throws TernException
	 */
	public static ITernModuleConfigurable findConfigurable(ITernModule module,
			JsonValue options, List<ITernModule> allModules)
			throws TernException {
		String version = module.getVersion();
		for (ITernModule f : allModules) {
			if (f.getModuleType() == ModuleType.Configurable
					&& f.getType() == module.getType()) {
				if (!StringUtils.isEmpty(version)) {
					((ITernModuleConfigurable) f).setVersion(version);
				}
				if (options instanceof JsonObject) {
					// set a copy of the options.
					((ITernModuleConfigurable) f).setOptions(new JsonObject(
							(JsonObject) options));
				}
				return (ITernModuleConfigurable) f;
			}
		}
		return null;
	}

	/**
	 * Returns true if the given module has options and false otherwise.
	 * 
	 * @param module
	 * @return true if the given module has options and false otherwise.
	 */
	public static boolean hasOptions(ITernModule module) {
		if (module == null || module.getMetadata() == null) {
			return false;
		}
		return module.getMetadata().hasOptions();
	}

	public static ITernModule getModule(String filename) {
		if (filename.startsWith(TERN_SUFFIX)) {
			String name = filename.substring(TERN_SUFFIX.length(),
					filename.length());
			return getPlugin(name);
		}
		int index = filename.lastIndexOf('.');
		if (index == -1) {
			return null;
		}
		String fileExtension = filename.substring(index + 1, filename.length());
		if (fileExtension.equals(JSON_EXTENSION)) {
			String name = filename.substring(0, index);
			return getDef(name);
		} else if (fileExtension.equals(JS_EXTENSION)) {
			String name = filename.substring(0, index);
			return getPlugin(name);
		}
		return null;
	}

	private static ITernDef getDef(String name) {
		ITernDef def = TernDef.getTernDef(name);
		if (def != null) {
			return def;
		}
		return new BasicTernDef(name);
	}

	/**
	 * Return the tern plugin by name.
	 * 
	 * @param name
	 * @return
	 */
	private static ITernPlugin getPlugin(String name) {
		// tern plugin
		ITernPlugin plugin = TernPlugin.getTernPlugin(name);
		if (plugin != null) {
			return plugin;
		}
		return new BasicTernPlugin(name);
	}

	/**
	 * Returns the file path as string.
	 * 
	 * @param file
	 * @return the file path as string.
	 */
	public static String getPath(File file) {
		try {
			return file.getCanonicalPath();
		} catch (IOException e) {
			return file.getPath();
		}
	}

	/**
	 * Returns the file name of the given tern module.
	 * 
	 * @param module
	 * @return the file name of the given tern module.
	 */
	public static String getFileName(ITernModule module) {
		switch (module.getModuleType()) {
		case Def:
			return new StringBuilder(module.getName()).append('.')
					.append(JSON_EXTENSION).toString();
		default:
			return new StringBuilder(module.getName()).append('.')
					.append(JS_EXTENSION).toString();
		}
	}
	
	public static String getDisplayName(ITernModule module) {
		TernModuleMetadata metadata = module.getMetadata();
		if (metadata == null || StringUtils.isEmpty(metadata.getLabel())) {
			return module.getType();
		}
		return metadata.getLabel();
	}

	/**
	 * Sort the given list of modules by dependencies.
	 * 
	 * @param modules
	 */
	public static void sort(List<ITernModule> modules) {
		new ModuleDependenciesComparator(modules);
	}

	/**
	 * Format list modules as string.
	 * 
	 * @return format list modules as string.
	 */
	public static String getModulesAsString(ITernModule... modules) {
		StringBuilder s = new StringBuilder();
		for (int i = 0; i < modules.length; i++) {
			if (i > 0) {
				s.append(",");
			}
			s.append(modules[i].getName());
		}
		return s.toString();
	}

	/**
	 * Returns the label of the given module.
	 * 
	 * @param module
	 * @return the label of the given module.
	 */
	public static String getLabel(ITernModule module) {
		TernModuleMetadata metadata = module.getMetadata();
		if (metadata != null && !StringUtils.isEmpty(metadata.getLabel())) {
			return metadata.getLabel();
		}
		return module.getName();
	}
}
