package tern.eclipse.ide.ui.contentassist;

import org.eclipse.core.resources.IProject;
import org.eclipse.core.resources.ProjectScope;
import org.eclipse.core.runtime.Platform;
import org.eclipse.core.runtime.preferences.DefaultScope;
import org.eclipse.core.runtime.preferences.IPreferencesService;
import org.eclipse.core.runtime.preferences.IScopeContext;
import org.eclipse.core.runtime.preferences.InstanceScope;

import tern.eclipse.ide.internal.ui.preferences.TernUIPreferenceConstants;
import tern.eclipse.ide.ui.TernUIPlugin;
import tern.server.protocol.completions.TernCompletionsQuery;

public class TernCompletionsQueryFactory {

	public static TernCompletionsQuery createQuery(IProject project,
			String file, int pos) {
		TernCompletionsQuery query = new TernCompletionsQuery(file, pos);

		query.setTypes(true);
		query.setDocs(true);
		query.setUrls(true);
		query.setOrigins(true);
		query.setCaseInsensitive(true);
		query.setLineCharPositions(false);
		query.setExpandWordForward(false);
		
		//ME tweaks
		query.add("depths", true); //$NON-NLS-1$
		query.add("includeKeywords", true); //$NON-NLS-1$

		IPreferencesService preferencesService = Platform
				.getPreferencesService();
		IScopeContext[] lookupOrder = new IScopeContext[] {
				new ProjectScope(project), InstanceScope.INSTANCE,
				DefaultScope.INSTANCE };

		boolean omitObjectPrototype = getBoolean(
				TernUIPreferenceConstants.OMIT_OBJECT_PROTOTYPE_CONTENT_ASSIST,
				preferencesService, lookupOrder);
		if (!omitObjectPrototype) {
			query.setOmitObjectPrototype (omitObjectPrototype );
		}
		return query;
	}

	protected static boolean getBoolean(String key,
			IPreferencesService preferencesService, IScopeContext[] lookupOrder) {
		return preferencesService.getBoolean(TernUIPlugin.getDefault()
				.getBundle().getSymbolicName(), key, true, lookupOrder);
	}
}
