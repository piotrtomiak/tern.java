package tern.server.protocol.refs;

import tern.server.protocol.TernQuery;

/**
 * @see @See http://ternjs.net/doc/manual.html#req_refs
 *
 */
public class TernRefsQuery extends TernQuery {

	private static final long serialVersionUID = 1L;

	private static final String REFS_TYPE_QUERY = "refs";

	public TernRefsQuery(String file, Integer pos) {
		this(file, pos, null);
	}
	
	public TernRefsQuery(String file, Integer pos, Boolean onlySourceFile) {
		super(REFS_TYPE_QUERY);
		setFile(file);
		setEnd(pos);
		if (onlySourceFile != null) {
			set("onlySourceFile", onlySourceFile); //$NON-NLS-1$
		}
	}

}
