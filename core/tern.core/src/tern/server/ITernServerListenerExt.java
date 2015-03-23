/*
 * Copyright 2015, Genuitec, LLC
 * All Rights Reserved.
 */
package tern.server;

public interface ITernServerListenerExt extends ITernServerListener {

	/**
	 * Method called when the given tern server times out.
	 * @param server
	 */
	void onTimeout(ITernServer server);
	
}
