package tern.angular;

import org.junit.Assert;
import org.junit.Test;

import tern.angular.modules.AngularModulesManager;
import tern.angular.modules.Directive;
import tern.angular.modules.DirectiveParameter;
import tern.angular.modules.Module;

public class AngulaModulesManagerTest {

	@Test
	public void testNgPluralize() throws Exception {
		Module module = AngularModulesManager.getInstance().getModule("ng");
		Assert.assertNotNull(module);
		Directive directive = module.getDirective(null, "ngPluralize");
		Assert.assertNotNull(directive);
		Assert.assertTrue(directive.hasParameters());
		DirectiveParameter parameter = directive.getParameter("count");
		Assert.assertNotNull(parameter);
	}
}
