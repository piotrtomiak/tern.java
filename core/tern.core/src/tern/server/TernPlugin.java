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
package tern.server;

import tern.metadata.TernModuleMetadata;
import tern.metadata.TernModuleMetadataManager;

public enum TernPlugin implements ITernPlugin {

	aui("tern/plugin/aui", "AlloyUI"), 
	angular("tern/plugin/angular", "AngularJS"), 
	chrome_apps("chrome-apps", "chrome-apps", null, null, "Chrome Apps"), 
	component("tern/plugin/component", "Component"), 
	ckeditor_4_4_1("ckeditor", "4.4.1", "CKEditor"), 
	closure("","Closure"), 
	cordovajs("tern/plugin/cordovajs", "Cordova Javascript"), 
	doc_comment("tern/plugin/doc_comment", "JSDoc Support"), 
	dojotoolkit_1_6("dojotoolkit", "1.6", "Dojo Toolkit"), 
	dojotoolkit_1_8("dojotoolkit", "1.8", "Dojo Toolkit"), 
	dojotoolkit_1_9("dojotoolkit", "1.9", "Dojo Toolkit"), 
	extjs_4_2_1("extjs", "4.2.1", "ExtJS"), 
	extjs_5_0_0("extjs", "5.0.0", "ExtJS"), 
	gas("tern/plugin/gas", "Google Apps Script"), 
	gmaps_3_16("gmaps", "3.16", "Google Maps"), 
	gmaps_3_17("gmaps", "3.17", "Google Maps"), 
	grunt("tern/plugin/grunt", "Grunt"), 
	liferay("tern/plugin/liferay", "Liferay"), 
	lint("tern/plugin/lint", "Lint"), 
	node_express("node-express", "node-express", null, null, "Node.js Express"), 
	node_mongodb_native("node-mongodb-native", "node-mongodb-native", null, null, "Node.js MongoDB Native Driver"), 
	node_mongoose("node-mongoose", "node-mongoose", null, null, "Node.js Mongoose"), 
	node("tern/plugin/node", "Node.js"), 
	meteor("tern/plugin/meteor", "Meteor"), 
	qooxdoo_4_1("qooxdoo", "4.1", "Qooxdoo"), 
	requirejs("tern/plugin/requirejs", "RequireJS"), 
	yui("tern/plugin/yui", "YUI");

	private final String name;
	private final String displayName;
	private final String type;
	private final String version;
	private final String path;
	private TernModuleMetadata metadata;

	private TernPlugin(String path, String displayName) {
		this(null, null, null, path, displayName);
	}

	private TernPlugin(String type, String version, String displayName) {
		this(new StringBuilder(type).append("_").append(version).toString(),
				type, version, new StringBuilder("tern/plugin/").append(type)
						.append("_").append(version).toString(), displayName);
	}

	private TernPlugin(String name, String type, String version, String path, String displayName) {
		this.name = name != null ? name : name();
		this.type = type != null ? type : name();
		this.path = path;
		this.displayName = displayName;
		this.version = version;
		this.metadata = null;
	}

	@Override
	public String getName() {
		return name;
	}
	
	@Override
	public String getDisplayName() {
		return displayName;
	}

	@Override
	public String getType() {
		return type;
	}

	@Override
	public String getVersion() {
		return version;
	}

	@Override
	public String getPath() {
		return path;
	}

	@Override
	public ModuleType getModuleType() {
		return ModuleType.Plugin;
	}

	public static ITernPlugin getTernPlugin(String name) {
		TernPlugin[] plugins = values();
		TernPlugin plugin = null;
		for (int i = 0; i < plugins.length; i++) {
			plugin = plugins[i];
			if (plugin.getName().equals(name)) {
				return plugin;
			}
		}
		return null;
	}

	@Override
	public TernModuleMetadata getMetadata() {
		if (metadata == null) {
			metadata = TernModuleMetadataManager.getInstance().getMetadata(
					getType());
		}
		return metadata;
	}
}
