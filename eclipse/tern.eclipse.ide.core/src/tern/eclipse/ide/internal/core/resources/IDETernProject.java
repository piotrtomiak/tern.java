/**
 *  Copyright (c) 2013-2016 Angelo ZERR and Genuitec LLC.
 *  All rights reserved. This program and the accompanying materials
 *  are made available under the terms of the Eclipse Public License v1.0
 *  which accompanies this distribution, and is available at
 *  http://www.eclipse.org/legal/epl-v10.html
 *
 *  Contributors:
 *  Angelo Zerr <angelo.zerr@gmail.com> - initial API and implementation
 *  Piotr Tomiak <piotr@genuitec.com> - refactoring of file management API
 */
package tern.eclipse.ide.internal.core.resources;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.eclipse.core.resources.IContainer;
import org.eclipse.core.resources.IFile;
import org.eclipse.core.resources.IProject;
import org.eclipse.core.resources.IResource;
import org.eclipse.core.resources.IResourceVisitor;
import org.eclipse.core.runtime.CoreException;
import org.eclipse.core.runtime.QualifiedName;

import com.eclipsesource.json.JsonObject;
import com.eclipsesource.json.WriterConfig;

import tern.ITernFile;
import tern.TernException;
import tern.eclipse.ide.core.IIDETernProject;
import tern.eclipse.ide.core.IIDETernScriptPathReporter;
import tern.eclipse.ide.core.IScopeContext;
import tern.eclipse.ide.core.ITernConsoleConnector;
import tern.eclipse.ide.core.ITernProjectLifecycleListener.LifecycleEventType;
import tern.eclipse.ide.core.ITernServerPreferencesListener;
import tern.eclipse.ide.core.ITernServerType;
import tern.eclipse.ide.core.IWorkingCopy;
import tern.eclipse.ide.core.TernCorePlugin;
import tern.eclipse.ide.internal.core.TernConsoleConnectorManager;
import tern.eclipse.ide.internal.core.TernNatureAdaptersManager;
import tern.eclipse.ide.internal.core.TernProjectLifecycleManager;
import tern.eclipse.ide.internal.core.TernRepositoryManager;
import tern.eclipse.ide.internal.core.TernServerListenersManager;
import tern.eclipse.ide.internal.core.Trace;
import tern.eclipse.ide.internal.core.WorkingCopy;
import tern.eclipse.ide.internal.core.preferences.TernCorePreferencesSupport;
import tern.repository.ITernRepository;
import tern.resources.TernFileSynchronizer;
import tern.resources.TernProject;
import tern.scriptpath.ITernScriptPath;
import tern.scriptpath.ITernScriptPath.ScriptPathsType;
import tern.server.ITernModule;
import tern.server.ITernServer;
import tern.server.ITernServerListener;
import tern.server.TernServerAdapter;
import tern.utils.IOUtils;
import tern.utils.StringUtils;
import tern.utils.TernModuleHelper;

/**
 * Eclipse IDE Tern project.
 * 
 */
public class IDETernProject extends TernProject implements IIDETernProject, ITernServerPreferencesListener {

	private static final QualifiedName TERN_PROJECT = new QualifiedName(TernCorePlugin.PLUGIN_ID + ".sessionprops", //$NON-NLS-1$
			"TernProject"); //$NON-NLS-1$

	private static final String IDE_JSON_FIELD = "ide"; //$NON-NLS-1$

	private static final long serialVersionUID = 1L;

	protected final IProject project;

	private ITernServer ternServer;

	private final Map<String, Object> data;

	private final List<ITernServerListener> listeners;

	private final IWorkingCopy workingCopy;

	// Broadcast monitor written for usage in Metrics code.
	public static class TernModuleModifyBroadCastMonitor {
		static List<IBroadCastListener> broadcastListeners = new ArrayList<IBroadCastListener>();

		public static void addListener(IBroadCastListener listener) {
			if (!broadcastListeners.contains(listener))
				broadcastListeners.add(listener);
		}

		public static void fireEvent() {
			notifyListeners();
		}

		private static void notifyListeners() {
			for (IBroadCastListener listener : broadcastListeners) {
				listener.handleEvent();
			}
		}

		public static void removeListener(
				IBroadCastListener listener) {
			broadcastListeners.remove(listener);
		}
	}

	protected IDETernProject(IProject project) throws CoreException {
		super(project.getLocation().toFile());
		this.project = project;
		this.data = new HashMap<String, Object>();
		this.listeners = new ArrayList<ITernServerListener>();
		this.workingCopy = new WorkingCopy(this);
		TernCorePlugin.getTernServerTypeManager().addServerPreferencesListener(this);
		project.setSessionProperty(TERN_PROJECT, this);
	}

	/**
	 * Returns the Eclispe project.
	 * 
	 * @return
	 */
	@Override
	public IProject getProject() {
		return project;
	}

	@Override
	public String getName() {
		return project.getName();
	}

	/**
	 * Returns the linked instance of tern server.
	 * 
	 * @return
	 */
	@Override
	public ITernServer getTernServer() {
		synchronized (serverLock) {
			if (isServerDisposed()) {
				try {
					ITernServerType type = TernCorePreferencesSupport.getInstance().getServerType();
					this.ternServer = type.createServer(this);
					this.ternServer.setLoadingLocalPlugins(
							TernCorePreferencesSupport.getInstance().isLoadingLocalPlugins(project));
					this.ternServer.setQualityLevel(TernCorePreferencesSupport.
							getInstance().getQualityLevel(project));
					this.ternServer.setRequestTimeout(TernCorePreferencesSupport.
							getInstance().getRequestTimeout(project) * 1000);
					this.ternServer.addServerListener(new TernServerAdapter() {
						@Override
						public void onStop(ITernServer server) {
							getFileSynchronizer().cleanIndexedFiles();
						}
					});
					if (!TernCorePreferencesSupport.getInstance().isDisableAsynchronousReques(project)) {
						this.ternServer.setRequestProcessor(new IDETernServerAsyncReqProcessor(ternServer));
					}
					copyListeners();
					copyMessageListeners();
					configureConsole();
				} catch (Exception e) {
					// should be improved?
					Trace.trace(Trace.SEVERE, "Error while creating tern server", e);
				}

			}
			return ternServer;
		}
	}

	public boolean isServerDisposed() {
		synchronized (serverLock) {
			return ternServer == null || ternServer.isDisposed();
		}
	}

	/**
	 * Return true if the given project have tern nature
	 * "tern.eclipse.ide.core.ternnature" and false otherwise.
	 * 
	 * @param project
	 *            Eclipse project.
	 * @return true if the given project have tern nature
	 *         "tern.eclipse.ide.core.ternnature" and false otherwise.
	 */
	public static boolean hasTernNature(IProject project) {
		return TernNatureAdaptersManager.getManager().hasTernNature(project);
	}

	@Override
	protected void doLoad() throws IOException {
		try {
			
			
			disposeServer();
			TernProjectLifecycleManager.getManager().fireTernProjectLifeCycleListenerChanged(this,
					LifecycleEventType.onLoadBefore);
			super.doLoad();
			// Load IDE informations of the tern project.
			loadIDEInfos();

			// the tern project is loaded on the first time, load default
			// modules and save .tern-project.
			initAdaptedNaturesInfos();
			
		} finally {
			TernProjectLifecycleManager.getManager().fireTernProjectLifeCycleListenerChanged(this,
					LifecycleEventType.onLoadAfter);
		}
	}
	
	@Override
	protected void onLintersChanged() {
		TernProjectLifecycleManager.getManager().fireTernProjectLifeCycleListenerChanged(this,
				LifecycleEventType.onLintersChanged);
	}

	/**
	 * Load IDE informations from the JSON .tern-project file.
	 */
	private void loadIDEInfos() {
		// Load script paths
		JsonObject ide = (JsonObject) super.get(IDE_JSON_FIELD);
		if (ide != null) {
			// There is ide information.
		}
	}

	/*
	 * Configures Tern Modules (Libraries and Plugins) that are default for Tern
	 * Nature Adapters active on a project
	 */
	private void initAdaptedNaturesInfos() {
		try {
			TernNatureAdaptersManager.getManager().addDefaultModules(this);
		} catch (CoreException e) {
			Trace.trace(Trace.SEVERE, "Error while configuring default tern project modules", e);
			return;
		}

		try {
			save();
		} catch (IOException e) {
			Trace.trace(Trace.SEVERE, "Error while saving tern project", e);
		}
	}

	@Override
	public IFile getIDEFile(String name) {
		ITernFile tf = getFile(name);
		if (tf != null) {
			return (IFile) tf.getAdapter(IFile.class);
		}
		return null;
	}

	@Override
	protected void doSave() throws IOException {
		try {

			TernProjectLifecycleManager.getManager().fireTernProjectLifeCycleListenerChanged(this,
					LifecycleEventType.onSaveBefore);
			// Store IDE tern project info.
			saveIDEInfos();

			if (isDirty()) {
				// save .tern-project
				IFile file = project.getFile(TERN_PROJECT_FILE);
				InputStream content = null;
				try {
					content = IOUtils.toInputStream(super.toString(WriterConfig.PRETTY_PRINT),
							file.exists() ? file.getCharset() : StringUtils.UTF_8);
					if (!file.exists()) {
						file.create(content, IResource.NONE, null);
					} else {
						file.setContents(content, true, false, null);
					}
				} catch (CoreException e) {
					throw new IOException("Cannot save .tern-project", e);
				} finally {
					if (content != null) {
						IOUtils.closeQuietly(content);
					}
				}
				// .tern-project has changed, dispose the server.
				disposeServer();
			}
		} finally {
			TernProjectLifecycleManager.getManager().fireTernProjectLifeCycleListenerChanged(this,
					LifecycleEventType.onSaveAfter);
		}
	}

	@Override
	public void handleException(Throwable t) {
		Trace.trace(Trace.SEVERE, t.getMessage(), t);
	}

	/**
	 * Save IDE informations in the JSON file .tern-project.
	 */
	private void saveIDEInfos() {
	}

	/**
	 * Returns the list of script paths.
	 * 
	 * @return
	 */
	@Override
	public List<ITernScriptPath> getScriptPaths() {
		throw new UnsupportedOperationException();
	}

	/**
	 * Create the script path instance from the given resource and type.
	 * 
	 * @param resource
	 *            the root resource.
	 * @param type
	 *            of the script path.
	 * @param inclusionPatterns
	 *            include patterns or null
	 * @param exclusionPatterns
	 *            exclude patterns or null
	 * @return
	 */
	@Override
	public ITernScriptPath createScriptPath(IResource resource, ScriptPathsType type, String[] inclusionPatterns,
			String[] exclusionPatterns) {
		throw new UnsupportedOperationException();
	}

	/**
	 * Set the new script paths to use.
	 * 
	 * @param scriptPaths
	 * @throws IOException
	 */
	public void setScriptPaths(List<ITernScriptPath> scriptPaths) throws IOException {
		throw new UnsupportedOperationException();
	}

	@Override
	public ITernScriptPath addExternalScriptPath(IResource resource, ScriptPathsType type, String[] inclusionPatterns,
			String[] exclusionPatterns, String external) throws IOException {
		throw new UnsupportedOperationException();
	}

	@Override
	public void removeExternalScriptPaths(String external) {
		throw new UnsupportedOperationException();
	}

	@Override
	public Object getAdapter(@SuppressWarnings("rawtypes") Class adapterClass) {
		if (adapterClass == IProject.class || adapterClass == IContainer.class || adapterClass == IResource.class) {
			return project;
		}
		return super.getAdapter(adapterClass);
	}

	@Override
	public boolean equals(Object value) {
		if (value instanceof IDETernProject) {
			return ((IDETernProject) value).getProject().equals(getProject());
		}
		return super.equals(value);
	}

	/**
	 * Returns the script path instance from the given path and null otherwise.
	 * 
	 * @param path
	 *            of the script path resource.
	 * @return the script path instance from the given path and null otherwise.
	 */
	public ITernScriptPath getScriptPath(String path) {
		for (ITernScriptPath scriptPath : getScriptPaths()) {
			if (scriptPath.getPath().equals(path)) {
				return scriptPath;
			}
		}
		return null;
	}

	/**
	 * Returns true if trace of the tern server (JSON request/response) should
	 * be displayed on the Eclipse console and false otherwise.
	 * 
	 * @return
	 */
	public boolean isTraceOnConsole() {
		return TernCorePreferencesSupport.getInstance().isTraceOnConsole(project);
	}

	/**
	 * Configure console to show/hide JSON request/response of the tern server.
	 */
	public void configureConsole() {
		synchronized (serverLock) {
			if (ternServer != null) {
				// There is a tern server instance., Retrieve the well connector
				// the
				// the eclipse console.
				ITernConsoleConnector connector = TernConsoleConnectorManager.getManager().getConnector(ternServer);
				if (connector != null) {
					if (isTraceOnConsole()) {
						// connect the tern server to the eclipse console.
						connector.connectToConsole(ternServer, this);
					} else {
						// disconnect the tern server to the eclipse console.
						connector.disconnectToConsole(ternServer, this);
					}
				}
			}
		}
	}

	public void disposeServer() {
		synchronized (serverLock) {
			if (!isServerDisposed()) {
				if (ternServer != null) {
					// notify uploader that we are going to dispose the server,
					// so that it can finish gracefully
					((IDETernFileUploader) ((TernFileSynchronizer) getFileSynchronizer()).getTernFileUploader())
							.serverToBeDisposed();
					ternServer.dispose();
					ternServer = null;
				}
			}
		}
	}

	@SuppressWarnings("unchecked")
	public <T> T getData(String key) {
		synchronized (data) {
			return (T) data.get(key);
		}
	}

	public void setData(String key, Object value) {
		synchronized (data) {
			data.put(key, value);
		}
	}

	@Override
	public void serverPreferencesChanged(IProject project) {
		if (project == null || getProject().equals(project)) {
			disposeServer();
		}
	}

	// ----------------------- Tern server listeners.

	@Override
	public void addServerListener(ITernServerListener listener) {
		synchronized (listeners) {
			if (!listeners.contains(listener)) {
				listeners.add(listener);
			}
		}
		copyListeners();
	}

	@Override
	public void removeServerListener(ITernServerListener listener) {
		synchronized (listeners) {
			listeners.remove(listener);
		}
		synchronized (serverLock) {
			if (ternServer != null) {
				this.ternServer.removeServerListener(listener);
			}
		}
	}

	private void copyListeners() {
		synchronized (serverLock) {
			if (ternServer != null) {
				for (ITernServerListener listener : listeners) {
					this.ternServer.addServerListener(listener);
				}
				for (ITernServerListener listener : 
					TernServerListenersManager.getGlobalTernServerListeners()) {
					this.ternServer.addServerListener(listener);
				}
			}
		}
	}

	@Override
	public List<ITernModule> getProjectModules() {
		final List<ITernModule> modules = new ArrayList<ITernModule>();
		final ITernRepository projectRepository = getRepository();
		final ITernRepository defaultRepository = TernRepositoryManager.getManager().getDefaultRepository();
		if (project.isAccessible() && TernCorePreferencesSupport.getInstance().isLoadingLocalPlugins(project)) {
			try {
				project.accept(new IResourceVisitor() {

					@Override
					public boolean visit(IResource resource) throws CoreException {
						switch (resource.getType()) {
						case IResource.PROJECT:
							return true;
						case IResource.FILE:
							ITernModule module = TernModuleHelper.createModule(resource.getName(), projectRepository, defaultRepository);
							if (module != null) {
								modules.add(module);
							}
							return false;
						default:
							return false;
						}
					}
				});
			} catch (CoreException e) {
				Trace.trace(Trace.SEVERE, "Error while collecting tern plugin from the project root", e);
			}
		}
		return modules;
	}

	@Override
	public ITernRepository getRepository() {
		return TernRepositoryManager.getManager().getRepository(getProject());
	}

	public void dispose() throws CoreException {
		try {
			TernProjectLifecycleManager.getManager().fireTernProjectLifeCycleListenerChanged(this,
					LifecycleEventType.onDisposeBefore);
			disposeServer();
			getFileSynchronizer().dispose();
			if (project.isAccessible()) {
				project.setSessionProperty(TERN_PROJECT, null);
			}
		} finally {
			TernProjectLifecycleManager.getManager().fireTernProjectLifeCycleListenerChanged(this,
					LifecycleEventType.onDisposeAfter);
		}
	}

	public static IDETernProject getTernProject(IProject project) throws CoreException {
		return (IDETernProject) project.getSessionProperty(TERN_PROJECT);
	}

	@Override
	public List<ITernModule> getAllModules() throws TernException {
		// Add global tern module from the repository
		List<ITernModule> allModules = new ArrayList<ITernModule>(Arrays.asList(getRepository().getModules()));
		// Add local tern modules
		List<ITernModule> projectModules = getProjectModules();
		allModules.addAll(projectModules);
		return allModules;
	}

	@Override
	public IWorkingCopy getWorkingCopy(Object caller) throws TernException {
		if (workingCopy.isDirty()) {
			workingCopy.initialize();
		}
		workingCopy.call(caller);
		return workingCopy;
	}

	@Override
	public boolean isInScope(IResource resource, IScopeContext context) {
		throw new UnsupportedOperationException();
	}

	@Override
	public IIDETernScriptPathReporter getScriptPathReporter() {
		// Uncomment to have trace for include/exclude files.
		return null; //SysErrScriptPathReporter.INSTANCE;
	}

}
