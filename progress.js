/* Copyright (c) 2012-2013 Progress Software Corporation and/or its subsidiaries or affiliates.
 * All rights reserved.
 *
 * Redistributable Code.
 *
 */

// Version: 1.3.0.2013-07-02

/*
 * progress.js
 */


(function () {
		
var PROGRESS_JSDO_PCT_MAX_EMPTY_BLOCKS = 20;

var PROGRESS_JSDO_OP_STRING = [ "none", "create", "read", "update", "delete" ];



/* define these if not defined yet - they may already be defined if
   progress.session.js was included first */
if (typeof progress == 'undefined')
    progress = {};
if (typeof progress.data == 'undefined' )
    progress.data = {};

progress.util = {};
progress.data._nextid = 0;
progress.data._uidprefix = "" + ( Date.now ? Date.now() : (new Date().getTime()));

var UID_MAX_VALUE = 999999999999999; /* 15 - 9 */

progress.data._getNextId = function() {
	var uid = ++progress.data._nextid;
	if (uid >= UID_MAX_VALUE) {
		progress.data._nextid = uid = 1;
		progress.data._uidprefix = "" + ( Date.now ? Date.now() : (new Date().getTime()));
	}
	
	return progress.data._uidprefix + "-" + uid;	
};
	
/**
 * Utility class that allows subscribing and unsubscribing from named events.
 * 
 * @returns {progress.util.Observable}
 */
progress.util.Observable = function() {
	
	
	/*
	 * Example format of the events object.  Some event delegates may only
	 * have a function setup, others may optionally have scope, and possibly an operation filter
	 * 
	 * var  events = {
	 *   afterfill : [{
	 *     scope : {},  // this is optional
	 *     fn : function () {},
	 *     operation : 'getCustomers'  // this is optional
	 *   }, ...]
	 * 
	 * }
	 * 
	 * 
	 * 
	 */

	/*
	 * remove the given function from the array of observers
	 */
	function _filterObservers (observers, fn, scope, operation) {
		return observers.filter(function(el) {
			if (el.fn !== fn || el.scope !== scope || el.operation !== operation) {
				return el;	
			}
		}, this);		
	}

	/*
	 * bind the specified function so it receives callbacks when the
	 * specified event name is called. Event name is not case sensitive.
	 * An optional scope can be provided so that the function is executed
	 * in the given scope.  If no scope is given, then the function will be
	 * called without scope.
	 * 
	 * If the same function is registered for the same event a second time with
	 * the same scope the original subscription is removed and replaced with the new function
	 * to be called in the new scope.
	 * 
	 * This method has two signatures.
	 * 
	 * Signature 1:
	 * @param evt    The name of the event to bind a handler to. String. Not case sensitive.
	 * @param fn     The function callback for the event . Function.
	 * @param scope  The scope the function is to be run in. Object. Optional.
	 * 
	 * Signature 2:
	 *
	 * @param evt        The name of the event to bind a handler to. String. Not case sensitive
	 * @param operation  The name of the operation to bind to. String. Case sensitive.
	 * @param fn         The function callback for the event . Function.
	 * @param scope      The scope the function is to be run in. Object. Optional.
 
	 */
	this.subscribe = function(evt, operation, fn, scope) {

		if (!evt) {
			throw new Error("JSDO: Event name must be provided.");
		}
		
		this._events = this._events || {};
		evt = evt.toLowerCase();
		var observers = this._events[evt] || [];
		var op = undefined;
		
		if (arguments.length >=2 && (typeof arguments[0] == 'string') && (typeof arguments[1] == 'string')) {
			op = arguments[1];
			fn = arguments[2];
			scope = arguments[3];
			
		} else if (arguments.length >= 2 && (typeof arguments[0] == 'string') && (typeof arguments[1] == 'function')) {
			op = undefined;
			scope = arguments[2];
			fn = arguments[1];            
		} else {
			throw new Error("JSDO: Invalid signature for subscribe.");
		}
		
		// make sure we don't add duplicates
		observers = _filterObservers(observers, fn, scope, op);
		observers.push({fn : fn, scope : scope, operation : op});
		this._events[evt] = observers;
		
		
		return this;
	};

	/*
	 * remove the specified function so it no longer receives events from
	 * the given name. event name is not case sensitive.
	 * 
	 * This method has two signaturues.
	 * Signature 1:
	 * @param evt    Required. The name of the event for which to unbind the given function. String.
	 * @param fn     Required. The function to remove from the named event. Function.
	 * @param scope  Optional. The function scope in which to remove the listener. Object.
	 * 
	 * Signature 2:
	 * 
	 * @param evt       Required. The name of the event for which to unbind the given function. String. Not case sensitive
	 * @param operation Required.  The name of the operation to receive events. String. Case Sensitive
	 * @param fn        Required. The function to remove from the named event. Function.
	 * @param scope     Optional. The function scope in which to remove the listener. Object.
	 * 
	 */
	this.unsubscribe = function(evt, operation, fn, scope) {
		if (!evt) {
			throw new Error("JSDO: Event name must be provided.");
		}
		this._events = this._events || {};
		evt = evt.toLowerCase();
		var observers = this._events[evt] || [];
		if (observers.length > 0) {
			var op = undefined;
			
			if (arguments.length >= 2 && (typeof arguments[0] == 'string') && (typeof arguments[1] == 'string')) {
				op = arguments[1];
				fn = arguments[2];
				scope = arguments[3];
			} else if (arguments.length >= 2 && typeof(arguments[0] == 'string' && typeof(arguments[1] == 'function')) ) {
				op = undefined;
				fn = arguments[1];
				scope = arguments[2];			
			} else {
				throw new Error("JSDO: Invalid signature for unsubscribe.");
			}
			this._events[evt] = _filterObservers(observers, fn, scope, op);			
		}

		return this;
	};

	/*
	 * trigger an event of the given name, and pass the specified data to
	 * the subscribers of the event. Event name is not case sensitive.
	 * A variable numbers of arguments can be passed as arguments to the event handler.
	 * 
	 * This method has two signatures
	 * Signature 1:
	 * @param evt  The name of the event to fire.  String.  Not case sensitive.
	 * @param operation The name of the operation. String.  Case sensitive
	 * @param args Optional.  A variable number of arguments to pass to the event handlers.
	 * 
	 * Signature 2:
	 * @param evt  The name of the event to fire. String.  Not case sensitive
	 * @param args Optional.  A variable number of arguments to pass to the event handlers.
	 */
	this.trigger = function(evt, operation, args) {
		if (!evt) {
			throw new Error("JSDO: Event name must be provided.");
		}

		this._events = this._events || {};
		evt = evt.toLowerCase();
		var observers = this._events[evt] || [];;
		if (observers.length > 0) {
			var op = undefined;
			var args = Array.prototype.slice.call(arguments);
				
			if ((arguments.length >= 2) && (typeof arguments[0] == 'string') && (typeof arguments[1] == 'string')) {
				// in alt format the second argument is the event name, and the first is the operation name
				op = arguments[1];
				args = args.length > 2 ? args.slice(2) : [];
			} else if (arguments.length >= 1 && (typeof (evt) == 'string')) {
				op = undefined;
				args = args.length > 1 ? args.slice(1) : [];
			} else {
				throw new Error("JSDO: Invalid signature for trigger.");
			}
				
			
			observers.forEach(function(el) {
				if (el.operation === op) {
					el.fn.apply(el.scope, args);
				}
			});			
			
		}
		
		return this;
	};

	// unbind all listeners from the given event. If the
	// evt is undefined, then all listeners for all events are unbound
	// evnt name is not case sensitive
	// @param evt  Optional. The name of the event to unbind.  If not passed, then all events are unbound
	this.unsubscribeAll = function(evt, operation) {
		
		if (evt) {
			this._events = this._events || {};
			if (typeof (evt) == 'string') {
				evt = evt.toLowerCase();
				var observers = this._events[evt] || [];

				observers.forEach(function(el) {
					if (el.operation) {
						this.unsubscribe(evt, el.operation, evt.fn, evt.scope);	
					} else {
						this.unsubscribe(evt, el.fn, evt.scope);
					}
				}, this);
			}
		} else {
			this._events = {};
		}
		
		return this;
	};
};

var msg = {};
msg.msgs = {};
msg.msgs[ "jsdoMSG001" ] = "JSDO: JSDO has multiple tables. Please use {1} at the table reference level.";
msg.msgs[ "jsdoMSG002" ] = "JSDO: Working record for '{1}' is undefined.";
msg.msgs[ "jsdoMSG003" ] = "JSDO: {1} function requires a function as a parameter.";
msg.msgs[ "jsdoMSG004" ] = "JSDO: Unable to find resource '{1}' in the catalog.";
msg.msgs[ "jsdoMSG005" ] = "JSDO: Data for table '{1}' was not specified in addRecords() call.";
msg.msgs[ "jsdoMSG006" ] = "JSDO: Data for JSDO was not specified in addRecords() call.";
msg.msgs[ "jsdoMSG007" ] = "JSDO: Test function in {1} must return a boolean.";
msg.msgs[ "jsdoMSG008" ] = "JSDO: Invalid keyFields parameter in addRecords() call.";
msg.msgs[ "jsdoMSG009" ] = "JSDO: KeyField '{1}' in addRecords() call was not found in the schema.";
msg.msgs[ "jsdoMSG010" ] = "JSDO: Field '{1}' in relationship was not found in the schema.";
msg.msgs[ "jsdoMSG011" ] = "UIHelper: JSDO has multiple tables. Please use {1} at the table reference level.";
msg.msgs[ "jsdoMSG012" ] = "UIHelper: Invalid {2} parameter in {1} call.";
msg.msgs[ "jsdoMSG020" ] = "JSDO: tableName parameter must be a string in addRecords() call.";
msg.msgs[ "jsdoMSG021" ] = "JSDO: addMode parameter must be specified in addRecords() call.";
msg.msgs[ "jsdoMSG022" ] = "JSDO: Invalid addMode specified in addRecords() call.";
msg.msgs[ "jsdoMSG023" ] = "JSDO: Duplicate found in addRecords() call using APPEND mode.";
msg.msgs[ "jsdoMSG024" ] = "{1}: Unexpected signature in call to {2} function.";
msg.msgs[ "jsdoMSG025" ] = "{1}: Invalid parameters in call to {2} function.";
msg.msgs[ "jsdoMSG026" ] = "JSDO: saveChanges requires CREATE, UPDATE and DELETE operations to be defined.";
msg.msgs[ "jsdoMSG030" ] = "JSDO: Invalid {1}, expected {2}.";
msg.msgs[ "jsdoMSG031" ] = "JSDO: Specified sort field name '{1}' was not found in the schema.";	

msg.msgs[ "jsdoMSG100" ] = "JSDO: Unexpected HTTP response. Too many records.";
msg.msgs[ "jsdoMSG101" ] = "Network error while executing HTTP request.";

msg.msgs[ "jsdoMSG998" ] = "JSDO: JSON object in addRecords() must be DataSet or Temp-Table data.";

msg.getMsgText = function(n, args) {
	var text = msg.msgs[n];
	if (!text)
		throw new Error("Message text was not found by getMsgText()");
	for (var i=1;i<arguments.length;i++) {
		text = text.replace( new RegExp('\\{' + i + '\\}', 'g'), arguments[i]);
	}	

	return text;
};

progress.data.JSIndexEntry = function JSIndexEntry(index) {
	this.index = index;
};

progress.data.JSTableRef = function JSTableRef(jsdo, tableName) {
	this._jsdo = jsdo;
	this._name = tableName;
	this._schema = null;
	this._fields = null;	
	this._processed = [];
	this._visited = false;
	
	// record is used to represent the current record for a table reference
	this.record = null;

	// Data structure
	this._data = [];
	this._index = {};
	this._hasEmptyBlocks = false;

	// Arrays to keep track of changes
	this._beforeImage = {};
	this._added = [];
	this._changed = {};
	this._deleted = [];

	this._createIndex = function() {
		this._index = {};
    	this._hasEmptyBlocks = false;
		for (var i = 0; i < this._data.length; i++) {
			var block = this._data[i];
			if (!block) {
		    	this._hasEmptyBlocks = true;				
				continue;
			}
			var id = this._data[i]._id;
			if (!id) {
				id = progress.data._getNextId();
				this._data[i]._id = id;
			}
			this._index[id] = new progress.data.JSIndexEntry(i);
		}
		this._needCompaction = false;
	};

	this._compact = function () {
		var newDataArray = [];
        for (var i = 0; i < this._data.length; i++) {
			var block = this._data[i];
			if (block) {
				newDataArray.push(block);
			}
		}
		this._data = newDataArray;		
		this._createIndex();
	};

    this.getData = function () {
		if (this._needCompaction) {
			this._compact();			
		}    	
		var data = this._getRelatedData();		
		
		if (this._hasEmptyBlocks) {
			var numEmptyBlocks = 0;						
			var newDataArray = [];
	        for (var i = 0; i < data.length; i++) {
				var block = data[i];
				if (block) {
					newDataArray.push(block);
				}
				else {
					numEmptyBlocks++;					
				}
			}
	        if ((numEmptyBlocks * 100 / this._data.length) >= PROGRESS_JSDO_PCT_MAX_EMPTY_BLOCKS)
	        	this._needCompaction = true;	        
			return newDataArray;
		}
		
        return data;		
    };

	this._recToDataObject = function(record, includeChildren) {
		var array = [ record ];
		var dataObject = array;
		
    	if (typeof(includeChildren) == 'undefined') {
    		includeChildren = false;
    	}				
		if (this._jsdo._dataSetName) {
			dataObject = {};
			dataObject[this._jsdo._dataSetName] = {};
			dataObject[this._jsdo._dataSetName][this._name] = array;
			if (includeChildren && this._children.length > 0) {
				var jsrecord = this._findById(record._id, false);
				if (jsrecord) {
					for (var i = 0; i < this._children.length; i++) {
						var tableName = this._children[i];
						dataObject[this._jsdo._dataSetName][tableName] = this._jsdo._buffers[tableName]._getRelatedData(jsrecord);					
					}
				}
			}
		}
		else {
			if (this._jsdo._dataProperty) {
				dataObject = {};
				dataObject[this._jsdo._dataProperty] = array;
			}
		}
		return dataObject;
	};
	
    this._recFromDataObject = function (dataObject) {
    	var data = {};
    	if (dataObject) {
    		if (this._jsdo._dataSetName) {
    			if (dataObject[this._jsdo._dataSetName])
    				data = dataObject[this._jsdo._dataSetName][this._name];
    		}
    		else {
    			if (this._jsdo._dataProperty) {
    				if (dataObject[this._jsdo._dataProperty])
    					data = dataObject[this._jsdo._dataProperty];
    			}
    			else if (dataObject.data) {
    				data = dataObject.data;
    			}
    			else {
    				data = dataObject;
    			}	
    		}
    	}
    	
    	return data instanceof Array ? data[0] : data;
    };      
    
	// Property: schema
	this.getSchema = function () { return this._schema; };
	this.setSchema = function (schema) { this._schema = schema; };

    this.add = function (values) {
    	return this._add(values, true, true);    	
    };
	
    this._add = function (values, trackChanges, setWorkingRecord) {
    	if (typeof(trackChanges) == 'undefined') {
    		trackChanges = true;
    	}
    	if (typeof(setWorkingRecord) == 'undefined') {
    		setWorkingRecord = true;
    	}    	    	
        var record = {};
        
        // Assign values from the schema
        var schema = this.getSchema();
        for(var i = 0; i < schema.length; i++) {
            var fieldName = schema[i].name;
            if (schema[i].type == "array") {
            	record[fieldName] = [];
            	if (schema[i].maxItems) {
            		for (var j = 0; j < schema[i].maxItems; j++) {
                		record[fieldName][j] = schema[i]["default"];            			
            		}
            	}
            }
            else {
                if ((schema[i].type == "string")
                   	&& schema[i].format
					&& (schema[i].format.indexOf("date") != -1)
                    && (schema[i]["default"])) {
                    var initialValue = schema[i]["default"].toUpperCase();
                    switch(initialValue) {
                        case "NOW":
							record[fieldName] = new Date().toISOString();
                            break;
                        case "TODAY":
                            var t = new Date();
                            var m = String((t.getMonth()+1));
                            if (m.length == 1) m = '0' + m;
                            var d = String((t.getDate()));
                            if (d.length == 1) d = '0' + d;
							record[fieldName] = t.getFullYear()+'-'+m+'-'+d;
                            break;
                        default:
							record[fieldName] = schema[i]["default"];                            
                    }
                }
                else 
            		record[fieldName] = schema[i]["default"];
            }
        }
        
		// Assign values based on a relationship
		if (this._jsdo.useRelationships && this._relationship && this._parent) {
			if (this._jsdo._buffers[this._parent].record) {
				for (var j = 0; j < this._relationship.length; j++) {
					record[this._relationship[j].childFieldName] = 
						this._jsdo._buffers[this._parent].record.data[this._relationship[j].parentFieldName];
				}
			}
			else
    			throw new Error(msg.getMsgText("jsdoMSG002", this._parent));			
		}
		// Assign values from object parameter
        for (var v in values) {
            record[v] = values[v];
        }
        
        // Specify _id field - do not use schema default        
        record._id = progress.data._getNextId();        

		if (this.autoSort
			&& this._sortRecords
			&& (this._sortFn != undefined || this._sortObject.sortFields != undefined)) {
			if (this._needsAutoSorting) {
				this._data.push(record);
				this._sort();
			}
			else {
				// Find position of new record in _data and use splice
				for (var i=0; i<this._data.length;i++) {
					if (this._data[i] == null) continue; // Skip null elements
					var ret = this._sortFn?
								this._sortFn(record, this._data[i]) : 
								this._compareFields(record, this._data[i]);															
					if (ret == -1) break;
				}			
				this._data.splice(i, 0, record);
			}
			this._createIndex();
		}
		else {
			this._data.push(record);
			this._index[record._id] = new progress.data.JSIndexEntry(this._data.length - 1);			
		}

        var jsrecord = new progress.data.JSRecord(this, record);
        
        // Set record property ignoring relationships
        if (setWorkingRecord)
        	this._setRecord(jsrecord, true);
        
        if (trackChanges) {
    		// Save before image        	
        	this._beforeImage[record._id] = null;
    		// End - Save before image        	
            this._added.push(record._id);            
        }        
        return jsrecord;
    };

	/*
	 * Returns records related to the specified jsrecord.
	 * If jsrecord is not specified the parent working record is used.
	 */
    this._getRelatedData = function(jsrecord) {
		var data = [];

    	if (typeof(jsrecord) == 'undefined') {
			if (this._jsdo.useRelationships && this._relationship && this._parent) {
				jsrecord = this._jsdo._buffers[this._parent].record;
				if (!jsrecord)
					throw new Error(msg.getMsgText("jsdoMSG002", this._parent));			
			}
		}
		if (jsrecord) {
			// Filter records using relationship
			for (var i = 0; i < this._data.length; i++) {
				var block = this._data[i];
				if (!block) continue;

				var match = false;
				for (var j = 0; j < this._relationship.length; j++) {
					match = (jsrecord.data[this._relationship[j].parentFieldName] == this._data[i][this._relationship[j].childFieldName]);
					if (!match) break;
				}
				if (match)
					data.push(this._data[i]);
			}
		}
		else
			data = this._data;

		return data;		
    };       
    
    this._findFirst = function() {
		if (this._jsdo.useRelationships && this._relationship && this._parent) {
			if (this._jsdo._buffers[this._parent].record) {
				// Filter records using relationship
				for (var i = 0; i < this._data.length; i++) {
					var block = this._data[i];
					if (!block) continue;

					var match = false;
					for (var j = 0; j < this._relationship.length; j++) {
						match = (this._jsdo._buffers[this._parent].record.data[this._relationship[j].parentFieldName] == this._data[i][this._relationship[j].childFieldName]);
						if (!match) break;
					}
					if (match) {						
						return new progress.data.JSRecord(this, this._data[i]);						
					}
				}
			}
		}
		else {
			for (var i = 0; i < this._data.length; i++) {
				var block = this._data[i];
				if (!block) continue;

				return new progress.data.JSRecord(this, this._data[i]);						
			}						
		}

    	
    	return undefined;
    };
    
    this._setRecord = function(jsrecord, ignoreRelationships) {
    	if (jsrecord) {
    		this.record = jsrecord;
    	}
    	else {
    		this.record = undefined;    		
    	}
    	    	
		// Set child records only if useRelationships is true
		if (this._jsdo.useRelationships) {    	
			ignoreRelationships = ((typeof(ignoreRelationships) == 'boolean') && ignoreRelationships);
			
	        if (this._children && this._children.length > 0) {
	        	for (var i=0; i<this._children.length; i++) {
	        		var childTable = this._jsdo._buffers[this._children[i]];
	        		if (!ignoreRelationships && this.record && childTable._relationship) {
	        			childTable._setRecord ( childTable._findFirst() );
	        		}
	        		else {
	        			childTable._setRecord ( undefined, ignoreRelationships);
	        		}
	        	}
	        }    				
		}
    	
		if (this._jsdo._defaultTableRef) {
			this._jsdo.record = this.record; 
		}			    		    	
    };

    this.assign = function (values) {
    	if (this.record) {
    		return this.record.assign(values);
    	}
    	else
			throw new Error(msg.getMsgText("jsdoMSG002", this._name));    		
    };

    this.remove = function () {
		if (this.record) { 
			return this.record.remove();
		}
    	else
			throw new Error(msg.getMsgText("jsdoMSG002", this._name));		
	}; 	
	
    this.getId = function () {
    	if (this.record) {
    		return this.record.data._id;
    	}
    	else
    		return 0;
    };

    this.findById = function(id) {
    	return this._findById(id, true);
    };
    
    this._findById = function (id, setWorkingRecord) {
    	if (typeof(setWorkingRecord) == 'undefined') {
    		setWorkingRecord = true;
    	}    	
		if (id && this._index[id]) {
			var record = this._data[this._index[id].index];
			this.record = record ? (new progress.data.JSRecord(this, record)) : null;			
			if (setWorkingRecord)
				this._setRecord( this.record );        	
			return this.record;
		}
		
		if (setWorkingRecord)		
			this._setRecord( null );			
		return null;
    };

    /*
     * Finds a record in the JSDO memory using the specified function to determine the record.
     */    
    this.find = function (fn) {
    	if (typeof(fn) != 'function') {
    		throw new Error(msg.getMsgText("jsdoMSG003", "find()"));    		
    	}    	
		var data = this._getRelatedData();

        for (var i = 0; i < data.length; i++) {
			var block = data[i];
			if (!block) {
				continue;
			}        	        	
			this._setRecord( new progress.data.JSRecord(this, data[i]) );
			var result = fn(this.record);
			if (typeof(result) != 'boolean') {
	    		throw new Error(msg.getMsgText("jsdoMSG007", "find()"));
			}
			if (result) {
				return this.record;
			}
        }
        
    	this._setRecord( null );    	
		return null;
    };    

    /*
     * Loops through the records  
     */
    this.foreach = function (fn) {
    	if (typeof(fn) != 'function') {
    		throw new Error(msg.getMsgText("jsdoMSG003", "foreach()"));    		    		
    	}    	    	
		var numEmptyBlocks = 0;
		if (this._needCompaction)
			this._compact();

		var data = this._getRelatedData();

		this._inforeach = true;
        for (var i = 0; i < data.length; i++) {
			var block = data[i];
			if (!block) {
				numEmptyBlocks++;
				continue;
			}
			
        	this._setRecord( new progress.data.JSRecord(this, data[i]) );
			var result = fn(this.record);
			if ((typeof(result) != 'undefined') && !result)
            	break;
        }

		this._inforeach = false;

		if ((numEmptyBlocks * 100 / this._data.length) >= PROGRESS_JSDO_PCT_MAX_EMPTY_BLOCKS)
			this._needCompaction = true;
    };

    this._equalRecord = function (rec1, rec2, keyFields) {
		var field;		
    	var match = true;
    	for (var i=0; i < keyFields.length; i++) {
			var fieldName = keyFields[i];			
			var value1 = rec1[fieldName];
			var value2 = rec2[fieldName];

			if (!jsdo[tableName].caseSensitive) {			
				field = jsdo[tableName]._fields[fieldName.toLowerCase()];
				if (field && field.type == "string") {
					if (value1 != null)
						value1 = value1.toUpperCase();
					if (value2 != null)
						value2 = value2.toUpperCase();
				}
			}
						
    		match = (value1 == value2);
    		if (!match) return false;
    	}
    	return true;
    };
	
    // Private method to merge changes using merge modes: APPEND, FILL, MERGE and REPLACE
    this._getKey = function (record, keyFields) {
    	var keyObject = {};
    	for (var i=0; i < keyFields.length; i++) {
			var fieldName = keyFields[i];
			var value = record[fieldName];
			
			if (!jsdo[tableName].caseSensitive) {			
				field = jsdo[tableName]._fields[fieldName.toLowerCase()];
				if (field && field.type == "string") {
					if (value != null)
						value = value.toUpperCase();
				}
			}			
    		keyObject[fieldName] = value;
    	}
    	return JSON.stringify(keyObject);    	
    };    

	this._getCompareFn = function(sortObject) {
		if (typeof sortObject == 'function') {
			return function(rec1, rec2) {				
				if (rec1 == null) return 1;
				if (rec2 == null) return -1;
				
				var jsrec1 = new progress.data.JSRecord(this, rec1);
				var jsrec2 = new progress.data.JSRecord(this, rec2);				
				return sortObject(jsrec1, jsrec2);
			};
		}
		else return function(rec1, rec2) {
			var tableRef = sortObject.tableRef;
			var sortFields = sortObject.sortFields;
			if (!(sortFields instanceof Array)) return 0;
			var sortAscending = sortObject.sortAscending;
		
			if (rec1 == null) return 1;
			if (rec2 == null) return -1;
			
			var field;
			for (var i=0; i < sortFields.length; i++) {
				var fieldName = sortFields[i];				
				var value1 = rec1[fieldName];
				var value2 = rec2[fieldName];
			
				if (!tableRef.caseSensitive) {			
					field = tableRef._fields[fieldName.toLowerCase()];
					if (field && field.type == "string") {
                        if (value1 != null)
							value1 = value1.toUpperCase();
                        if (value2 != null)
							value2 = value2.toUpperCase();					
					}				
				}
				if (value1 > value2 || value1 == null)
                    return sortAscending[i] ? 1 : -1;
				else if (value1 < value2 || value2 == null)
					return sortAscending[i] ? -1 : 1;
			}
			return 0;
		};				
	};	
	
	this._sortObject = {};
	this._sortObject.tableRef = this;
	this._sortObject.sortFields = undefined;
	this._sortObject.sortAscending = undefined;		
	this._compareFields = this._getCompareFn(this._sortObject);

	// _sortRecords - Tells the table reference whether to sort on add, assign and addRecords		
	this._sortRecords = true;		
	this._needsAutoSorting = false; // Tells the table reference whether an autoSort is required on an add or assign
	this._sortFn = undefined;
	if ((typeof Object.defineProperty) == 'function') {
		this._autoSort = true;
		Object.defineProperty ( 
			this,
			"autoSort",
			{
				get: function() {
					return this._autoSort;
				},
				set: function(value) {
					if (value) {
						this._autoSort = true;
						if (this._sortFn || this._sortObject.sortFields) {
							this._sort();
							this._createIndex();
						}						
					}
					else
						this._autoSort = false;
				},
				enumerable: true,
				writeable: true
			});
		this._caseSensitive = false;
		Object.defineProperty ( 
			this,
			"caseSensitive",
			{
				get: function() {
					return this._caseSensitive;
				},
				set: function(value) {
					if (value) {
						this._caseSensitive = true;
					}
					else
						this._caseSensitive = false;
					if (this.autoSort &&
						(this._sortObject.sortFields && !this._sortFn)) {
						this._sort();
						this._createIndex();								
					}					
				},
				enumerable: true,
				writeable: true
			});			
	}
	else {
		this.autoSort = true;
		this.caseSensitive = false; // caseSensitive is false by default		
	}

	this._processSortFields = function(sortFields) {
		var sortObject = {};			
		if (sortFields instanceof Array) {						
			sortObject.sortFields = sortFields;
			sortObject.sortAscending = [];
            sortObject.fields = {};
			for (var i=0;i<sortObject.sortFields.length;i++) {
				var idx;
				var fieldName;
				var field;
				
				if (typeof (sortObject.sortFields[i]) != 'string') {
					throw new Error(msg.getMsgText("jsdoMSG030", "sort field name", "string element"));
				}				
				if ((idx = sortObject.sortFields[i].indexOf(':')) != -1) {
					fieldName = sortObject.sortFields[i].substring(0,idx);
					var sortOrder = sortObject.sortFields[i].substring(idx+1);
					switch(sortOrder.toUpperCase()) {
					case 'ASCENDING':
					case 'ASC':
						sortObject.sortAscending[i] = true;										
						break;
					case 'DESCENDING':						
					case 'DESC':
						sortObject.sortAscending[i] = false;
						break;
					default:
						throw new Error(msg.getMsgText("jsdoMSG030", "sort order '" + sortObject.sortFields[i].substring(idx+1) + "'", "ASCENDING or DESCENDING"));
					}
				}
				else {
					fieldName = sortObject.sortFields[i];
					sortObject.sortAscending[i] = true;
				}				
				if (fieldName != "_id" && this._fields) {
					field = this._fields[fieldName.toLowerCase()];
					if (field) {
						if (field.type == "array")
							throw new Error(msg.getMsgText("jsdoMSG030", "data type found in sort", "scalar field"));
						fieldName = field.name;
					}
					else
						throw new Error(msg.getMsgText("jsdoMSG031", fieldName));								
				}
				sortObject.sortFields[i] = fieldName;
                sortObject.fields[fieldName] = fieldName;
			}			
		}
		else {
			sortObject.sortFields = undefined;
			sortObject.sortAscending = undefined;
            sortObject.fields = undefined;
		}
		return sortObject;
	};
	
	this.setSortFields = function(sortFields) {
		if (sortFields == undefined) {
			this._sortObject.sortFields = undefined;
			this._sortObject.sortAscending = undefined;
		}
		else if (sortFields instanceof Array) {
			var sortObject = this._processSortFields(sortFields);
			this._sortObject.sortFields = sortObject.sortFields;
			this._sortObject.sortAscending = sortObject.sortAscending;
            this._sortObject.fields = sortObject.fields;
			
			if (this.autoSort) {
				this._sort();
				this._createIndex();
			}
		}
		else
			throw new Error(msg.getMsgText("jsdoMSG024", "JSDO", "setSortFields()"));
	};		
	
	this.setSortFn = function(fn) {
		if (fn != undefined && typeof (fn) != 'function') {
			throw new Error(msg.getMsgText("jsdoMSG030", "parameter in setSortFn()", "function parameter"));
		}						
		this._sortFn = fn != undefined ? this._getCompareFn(fn) : undefined;		
		if (this.autoSort) {
			this._sort();
			this._createIndex();
		}
	};
		
	this.sort = function(arg1) {
		if (arguments.length == 0 || arguments.length > 1
			|| (arg1 == undefined)
			|| (!(arg1 instanceof Array) && typeof(arg1) != 'function'))
				throw new Error(msg.getMsgText("jsdoMSG024", "JSDO", "sort()"));
		if (arg1 == undefined)
			throw new Error(msg.getMsgText("jsdoMSG025", "JSDO", "sort()"));
		
		if (arg1 instanceof Array) {
			var sortObject = this._processSortFields(arg1);
			if (sortObject.sortFields && sortObject.sortFields.length > 0)
				this._sort(sortObject);
		}
		else {
			this._sort(arg1);
		}
		this._createIndex();		
	};		

	this._sort = function(arg1) {
		if (arguments.length == 0 && 
			(!this.autoSort || (this._sortFn == undefined && this._sortObject.sortFields == undefined)))
			return;
		
		if (arguments.length == 0) {
			if (this._sortFn) {		
				// Sort using function
				this._data.sort(this._sortFn);
			}
			else {
				// Sort using sort fields
				this._data.sort(this._compareFields);
			}
			this._needsAutoSorting = false;
		}
		else {
			if (typeof(arg1) == 'function') {
				// Sort using function
				this._data.sort(this._getCompareFn(arg1));
			}
			else {
				// Sort using sort fields
				arg1.tableRef = this;
				this._data.sort(this._getCompareFn(arg1));
			}
			if (this.autoSort)
				this._needsAutoSorting = true;
		}
	};		
	
    /*
     * Reads a JSON object into the JSDO memory for the specified table reference.
     */
    this.addRecords = function (jsonObject, addMode, keyFields, trackChanges) {
        this._jsdo._addRecords(this._name, jsonObject, addMode, keyFields, trackChanges);    	
    };
    
};

/*
 * Returns a JSRecord for the specified JSDO.
 * @param jsdo the JSDO
 * @param record the values of the record
 */
progress.data.JSRecord = function JSRecord(tableRef, record) {
    this._tableRef = tableRef;
    this.data = record;

    this.getId = function () {
    	return this.data._id ? this.data._id : null;
    };
    
    /*
     * Saves a copy of the current record to the before image.
     */
	this._saveBeforeImageUpdate = function() {
		// Save before image 
		if (this._tableRef._beforeImage[this.data._id] === undefined) {
			// this.data._index = index;
			var copy = {};			
			this._tableRef._jsdo._copyRecord(
					this._tableRef, this.data, copy);						
			this._tableRef._beforeImage[this.data._id] = copy;
		}
		
		if (this._tableRef._changed[this.data._id] === undefined) {
			this._tableRef._changed[this.data._id] = this.data;			
		}
		// End - Save before image			
	};
    
	/*
	 * 
	 */
	this._sortRecord = function(fields) {
		var index = this._tableRef._index[this.data._id].index;
		var record = this._tableRef._data[index];
						
		if (this._tableRef.autoSort 
			&& this._tableRef._sortRecords
			&& (this._tableRef._sortFn != undefined || this._tableRef._sortObject.sortFields != undefined)) {

			if (this._tableRef._sortObject.fields) {
				if (typeof fields == 'string') {				
					if (this._tableRef._sortObject.fields[fields] == undefined)
						return; // Only sort records if the the specified field is in the sort fields				
				}
				else if (fields instanceof Array) {
					var found = false;
					for(var i=0;i<fields.length;i++){
						if (this._tableRef._sortObject.fields[fields[i]] != undefined) {
							found = true;
							break;
						}
					}                    
					if (!found)
						return; // Only sort records if the the specified fields are in the sort fields
				}
			}
            
			if (this._tableRef._needsAutoSorting) {
				this._tableRef._sort();
				this._tableRef._createIndex();			
			}
			else {
				// Find position of new record in _data and use splice
				for (var i=0; i<this._tableRef._data.length; i++) {
					if (this._tableRef._data[i] == null) continue; // Skip null elements					
					if (i == index) continue; // Skip changed record
					var ret = this._tableRef._sortFn?
								this._tableRef._sortFn(record, this._tableRef._data[i]) : 
								this._tableRef._compareFields(record, this._tableRef._data[i]);
					if (ret == -1) break;
				}
				
				if (i > index) {
					i--;
				}				
				if (i != index) {
					this._tableRef._data.splice(index, 1);
					this._tableRef._data.splice(i, 0, record);
					this._tableRef._createIndex();
				}					
			}						
		}		
	};
	
	/*
	 * Assigns the specified values.
	 * @param record parameter with the record values
	 */
	this.assign = function (record) {
		if (record === undefined)
			throw new Error(msg.getMsgText("jsdoMSG024", "JSDO", "assign()"));			
		
		this._saveBeforeImageUpdate();
		
		var fieldName;
		var value;
		var schema = this._tableRef.getSchema();
		if (record) {
			for(var i = 0; i < schema.length; i++) {
				fieldName = schema[i].name;
				value = record[fieldName];
				if (typeof value != "undefined") {
			    	this.data[fieldName] = value;
				}
			}
			
			this._sortRecord();
		}
		return true;
	};

	/*
	 * Removes the JSRecord.
	 */
    this.remove = function () {
        var index = this._tableRef._index[this.data._id].index;
		var jsrecord = this._tableRef._findById(this.data._id, false);
		
		// Save before image
		var record = this._tableRef._beforeImage[this.data._id]; 
		if (record === undefined) {
			// Record does not exist in the before image
			this.data._index = index;			
			this._tableRef._beforeImage[this.data._id] = this.data;
		}
		else {
			// Record exists in the before image
			if (record) {
				// Record is not null - a null entry in the before image indicates corresponds to an add
				// Save the index of the record
				// so that an undo would restore the record in the same position in _data
				record._index = index;
			}
		}
		// End - Save before image
		
        this._tableRef._deleted.push(jsrecord);
		// Set entry to null instead of removing entry - index requires positions to be persistent
		this._tableRef._data[index] = null;
		this._tableRef._hasEmptyBlocks = true;		
		delete this._tableRef._index[this.data._id];
		
        // Set record property
        this._tableRef._setRecord( null );
        
        return true;
    };

};

/*
 * Returns a JSDO for the specified resource.
 * @param resNameOrParmObj: the resource name or an object that contains the initial values for the JSDO
 *                          (if this is an object, it should include the name property with the resource name
 * @param serviceName : name of service (ignored if 1st param is an object containing the initial values)
 */
progress.data.JSDO = function JSDO(resNameOrParmObj, serviceName  ) {

	if (typeof progress.data.Session == 'undefined') {
		throw new Error ('ERROR: You must include progress.session.js');
	}
	
	this._defineProperty = function(tableName, fieldName) {
		Object.defineProperty ( 
				this._buffers[tableName],
				fieldName,
				{
					get: function fnGet() {
						if (this.record)
							return this.record.data[fieldName];
						else
							return null;
					},
					set: function(value) {
						if (this.record) {
							this.record._saveBeforeImageUpdate();
							this.record.data[fieldName] = value;
							this.record._sortRecord( fieldName );
						}
					},
					enumerable: true,
					writeable: true
				});						
	};		
		
	// Initial values
	this._buffers = {}; 		// Object of table references
	this._numBuffers = 0;
	this._defaultTableRef = null;

	this._async = true;
	this._dataProperty = null;
	this._dataSetName = null;
	this.operations = [];
	this.useRelationships = true;
	
	this._session = null;
	this._needCompaction = false;
	
	this._hasCUDOperations = false;
	
	var autoFill = false;
	
    // Initialize JSDO using init values
	if ( !arguments[0] ) {
		throw new Error("JSDO: Parameters are required in constructor.");
	}
	
	if ( typeof(arguments[0]) ==  "string") {
		this.name = arguments[0];
//		if ( arguments[1] && (typeof(arguments[1]) ==  "string") )
//			localServiceName = serviceName;
	}
	else if ( typeof(arguments[0]) == "object" ) {
		var args = arguments[0];
    	for (var v in args) {
    		switch(v) {
    		case 'autoFill':
    			autoFill = args[v];    			
    			break;
    		case 'events':
    			this._events = {};
    			for (var eventName in args[v]) {
    				this._events[eventName.toLowerCase()] = args[v][eventName];
    			}
    			break;
    		case 'dataProperty':
    			this._dataProperty = args[v];
    			break;
    		default:
    			this[v] = args[v];
    		}
    	}
	}
	/* error out if caller didn't pass the resource name */
    if ( (!this.name) /*|| !(this._session)*/ ) {
    	// make this error message more specific?
    	throw new Error( "JSDO: JSDO constructor is missing the value for 'name'" );
    }
    
    /* perform some basic validation on the event object for the proper structure if provided */
    if (this._events) {
        if ((typeof this._events) !== 'object') {
            throw new Error("JSDO: JSDO constructor event object is not defined as an object");
        }
        
        /* make sure all the event handlers are sane */
        for (var prop in this._events) {
            var evt = this._events[prop];
            if (!(evt instanceof Array)) {
                throw new Error('JSDO: JSDO constructor event object for ' + prop + ' must be an array');
            }
            evt.forEach(function (el) {
                if ((typeof el) !== 'object') {
                    throw new Error("JSDO: JSDO constuctor event object for " + prop + " is not defined as an object");
                }
                /* listener must have at least fn property defined as a function */
                if ((typeof el.fn) !== 'function') {
                    throw new Error("JSDO: JSDO event listener for " + prop + " is not a function.");
                }
                /* scope is optional, but must be an object if provided */
                if (el.scope && (typeof el.scope) !== 'object') {
                    throw new Error("JSDO: JSDO event listener scope for " + prop + " is not an object.");
                }               
            }); 
        }
    }
    
	if (this.name) {
		// Read resource definition from the Catalog - save reference to JSDO
		// Enhance this to deal with multiple services loaded and the same resource
		// name is used by more than one service (use the local serviceName var)
		this._resource = progress.data.ServicesManager.getResource(this.name);
		if (this._resource) {
			if (!this.url)
				this.url = this._resource.url;
			if (!this._dataSetName && this._resource._dataSetName) {
				// Catalog defines a DataSet
				this._dataSetName = this._resource._dataSetName;

				// Define TableRef property in the JSDO
				if (this._resource.dataProperty) {
					var buffer = this[this._resource.dataProperty] 
							   = new progress.data.JSTableRef(this, this._resource.dataProperty);
					this._buffers[this._resource.dataProperty] = buffer;
				}
				else {
					for (var tableName in this._resource.fields) {
						var buffer = this[tableName]
								   = new progress.data.JSTableRef(this, tableName);
						this._buffers[tableName] = buffer;
					}
				}
			}
			if (!this._dataProperty && this._resource.dataProperty)
				this._dataProperty = this._resource.dataProperty;

			if (!this._dataSetName) {
				var tableName = this._dataProperty?this._dataProperty:"";
				this._buffers[tableName] = new progress.data.JSTableRef(this, tableName);
				if (tableName)
					this[tableName] = this._buffers[tableName]; 
			}

			// Add functions for operations to JSDO object
			for (fnName in this._resource.fn) {
				this[fnName] = this._resource.fn[fnName]["function"];
			}
			// Check if CUD operations have been defined
			this._hasCUDOperations = 
				this._resource.generic["create"] != undefined 
				|| this._resource.generic["update"] != undefined
				|| this._resource.generic["delete"] != undefined;			
			
			/* get a session object, using name of the service to look it up in the list of
			 * sessions maintained by the ServicesManager
			 */
			if ( !this._session ) {
				var myservice = progress.data.ServicesManager.getService( this._resource.service.name );
				this._session = myservice._session;
			}
		}
		else {
			throw new Error(msg.getMsgText("jsdoMSG004", this.name));			
		}
	}
	else {
		this._buffers[""] = new progress.data.JSTableRef(this, "");
	}

	if ( !this._session) {
		throw new Error("JSDO: Unable to get user session for resource '" + this.name + "'");
	}	

	// Calculate _numBuffers and _defaultTableRef
	for (var buf in this._buffers) {
		this._buffers[buf]._parent = null;
		this._buffers[buf]._children = [];
		this._buffers[buf]._relationship = null;
		this._buffers[buf]._isNested = false;
		if (!this._defaultTableRef)
			this._defaultTableRef = this._buffers[buf];
		this._numBuffers++;
	}
	if (this._numBuffers != 1)
		this._defaultTableRef = null;
	else {
		// record is used to represent the current record for a table reference
		// data corresponds to the values (JSON object) of the data
		this.record = null;		
	}

	// Define caseSensitive property at the JSDO level
	if ((typeof Object.defineProperty) == 'function') {
		this._caseSensitive = false;	// caseSensitive is false by default
		Object.defineProperty ( 
			this,
			"caseSensitive",
			{
				get: function() {
					return this._caseSensitive;
				},
				set: function(value) {
					this._caseSensitive = value ? true : false;
					
					for (var buf in this._buffers) {			
						this._buffers[buf].caseSensitive = this._caseSensitive;
					}				
				},
				enumerable: true,
				writeable: true
			});
		this._autoSort = true;	// autoSort is true by default
		Object.defineProperty ( 
			this,
			"autoSort",
			{
				get: function() {						
					return this._autoSort;
				},
				set: function(value) {
					this._autoSort = value ? true : false;
					
					for (var buf in this._buffers) {			
						this._buffers[buf].autoSort = this._autoSort;
					}									
				},
				enumerable: true,
				writeable: true
			});			
	}
	
	

	// Set schema for TableRef
	if (this._resource && this._resource.fields) {
		for (var buf in this._buffers) {
			this._buffers[buf]._schema = this._resource.fields[buf];
			
			if (this._buffers[buf]._schema && (typeof Object.defineProperty) == 'function') {			
				// Add fields as properties of the TableRef object
				for (var i=0; i<this._buffers[buf]._schema.length;i++) {
					var fieldName = this._buffers[buf]._schema[i].name; 
					if (typeof(this._buffers[buf][fieldName]) == 'undefined') {
						this._defineProperty(buf, fieldName); 						
					}
				}			
			}
			
			// Create _fields object used to validate fields as case-insentive.
			this._buffers[buf]._fields = {};
			var fields = this._buffers[buf]._schema;			
			for ( var i = 0; i < fields.length; i++) {
				this._buffers[buf]._fields[fields[i].name.toLowerCase()] = fields[i];
			}					
			
		}
		// Set schema for when dataProperty is used but not specified via the catalog
		if (this._defaultTableRef 
			&& !this._defaultTableRef._schema
			&& this._resource.fields[""]) {
			this._defaultTableRef._schema = this._resource.fields[""];
		}
	}
	else {
		if (this._defaultTableRef)
			this._defaultTableRef._schema = [];
	}

	// Set isNested property
	if (this._numBuffers > 1) {
		for (var buf in this._buffers) {
			var fields = [];
			var found = false;
			for (var i = 0; i < this._buffers[buf]._schema.length; i++) {
				var field = this._buffers[buf]._schema[i];

				if (field.items
					&& field.type == "array" && field.items.$ref) { 
					if (this._buffers[field.name]) {
						found = true;
						this._buffers[field.name]._isNested = true;
					}
				}
				else
					fields.push(field);
			}
			// Replace list of fields - removing nested datasets from schema
			if (found)
				this._buffers[buf]._schema = fields;
		}
	}	
	
	// Process relationships
	if (this._resource && this._resource.relations) {
		for (var i = 0; i < this._resource.relations.length; i++) {
			var relationship = this._resource.relations[i];			
			
			if (relationship.childName && relationship.parentName) {
				// Set casing of fields in relationFields to be the same as in the schema
				if (relationship.relationFields instanceof Array) {
					for (var j = 0; j < relationship.relationFields.length; j++) {
						var fieldName;
						var field;
						if (this._buffers[relationship.parentName]._fields) {
							fieldName = relationship.relationFields[j].parentFieldName;
							field = this._buffers[relationship.parentName]._fields[fieldName.toLowerCase()];
							if (field) {
								relationship.relationFields[j].parentFieldName = field.name;
							}
							else
								throw new Error(msg.getMsgText("jsdoMSG010", fieldName));								
						}
						if (this._buffers[relationship.childName]._fields) {
							fieldName = relationship.relationFields[j].childFieldName;
							field = this._buffers[relationship.childName]._fields[fieldName.toLowerCase()];
							if (field) {
								relationship.relationFields[j].childFieldName = field.name;
							}
							else
								throw new Error(msg.getMsgText("jsdoMSG010", fieldName));							
						}						
					}
				}
				this._buffers[relationship.childName]._parent = relationship.parentName;				
				this._buffers[relationship.childName]._relationship = relationship.relationFields;
				this._buffers[relationship.parentName]._children.push(relationship.childName);
			}				
		}
	}

	this.isDataSet = function() {
		return this._dataSetName ? true: false;
	};

	/* handler for invoke operation complete */
	this._invokeComplete = function (jsdo, success, request) {
		// only fire on async requests
		if (request.async && request.fnName) {
			jsdo.trigger('afterInvoke', request.fnName, jsdo, success, request);
		}
	};
	
	/* handler for invoke operation success */
	this._invokeSuccess = function (jsdo, success, request) {
		// do nothing
	};
	
	/* handler for invoke operation error */
	this._invokeError = function (jsdo, success, request) {
		// do nothing
	};

	/*
	 * Performs an HTTP request using the specified parameters.  This is 
	 * used to perform remote calls for the JSDO for operations defined.
	 * 
	 */
	this._httpRequest = function (xhr, method, url, reqBody, request) {

		// if xhr wasn't passed we'll create our own since this is an invoke operation
		// if xhr is passed, then it is probably a CRUD operation which is setup with XHR
		// in call to session
		if (!xhr) {
			xhr = new XMLHttpRequest();

			// only setup the callback handlers if we're responsible for creating the 
			// xhr call which happens on invoke operations...which is the normal case
			// the CRUD operations setup their own callbacks and they have their own
			// event handlers so we don't use them here.
			xhr.onCompleteFn = this._invokeComplete;
			xhr.onSuccessFn = this._invokeSuccess;
			xhr.onErrorFn = this._invokeError;
			xhr.onreadystatechange = this.onReadyStateChangeGeneric;

			// for invokes we always fire the invoke when doing async
			if (request.async && request.fnName) {
				this.trigger('beforeInvoke', request.fnName, this, request);
			}
			
			// For Invoke operations, wrap reqBody in a request object
			// This is not required for CRUD operations since the whole
			// reqBody is mapped to the parameter
			if (reqBody) {
				if (this._resource && this._resource.service
						&& this._resource.service.useRequest) {				
					reqBody = { request: reqBody };
				}
			}
		}
		
		xhr.request = request;
		xhr.jsdo = this;
		request.jsdo = this;
		request.xhr = xhr;

		this._session._openRequest(xhr, method, url, request.async);

		var input = null;
		if (reqBody) {
			xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8");
			input = JSON.stringify(reqBody);
		}
		
		try {
			xhr.send(input);
		} catch (e) {
			request.success = false;
			request.exception = e;
		}
		

		return request;
	};
	
	this._getDataObject = function() {
		var dataObject = {};
		if (this._dataSetName) {
			dataObject[this._dataSetName] = {};
			
			var oldUseRelationships = this.useRelationships;
			// Turn off useRelationships so that getData() returns all the records
			try {
				this.useRelationships = false;			
				for (var buf in this._buffers) {
					dataObject[this._dataSetName][buf] = this._buffers[buf].getData();
				}
			}
			finally {
				// Restore useRelationships
				this.useRelationships = oldUseRelationships;
			}
		}
		else {
			if (this._dataProperty) {
				dataObject[this._dataProperty] = this.getData();
			}
			else 
				return this.getData(); // Array
		}
		return dataObject;
	};
	
	this._recToDataObject = function(record, includeChildren) {
		if (this._defaultTableRef)
			return this._defaultTableRef._recToDataObject(record, includeChildren);
		throw new Error(msg.getMsgText("jsdoMSG001", "_recToDataObject()"));		
	};
	
    this._recFromDataObject = function (dataObject) {
		if (this._defaultTableRef)
			return this._defaultTableRef._recFromDataObject(dataObject);
		throw new Error(msg.getMsgText("jsdoMSG001", "_recFromDataObject()"));		
    };    
	
	this.add = function(obj) {
		if (this._defaultTableRef)
			return this._defaultTableRef.add(obj);
		throw new Error(msg.getMsgText("jsdoMSG001", "add()"));		
	};

	this.getData = function() {
		if (this._defaultTableRef)
			return this._defaultTableRef.getData();
		throw new Error(msg.getMsgText("jsdoMSG001", "getData()"));		
	};

    this.getSchema = function () {
		if (this._defaultTableRef)
			return this._defaultTableRef.getSchema();
		throw new Error(msg.getMsgText("jsdoMSG001", "getSchema()"));		
    };

    this.findById = function (id) {
		if (this._defaultTableRef)
			return this._defaultTableRef.findById(id);
		throw new Error(msg.getMsgText("jsdoMSG001", "findById()"));		
    };
    
    this.assign = function (values) {
		if (this._defaultTableRef) {
			return this._defaultTableRef.assign(values);
		}
		else
			throw new Error(msg.getMsgText("jsdoMSG001", "assign()"));				
    };
    
    this.remove = function () {
		if (this._defaultTableRef) {
			return this._defaultTableRef.remove();
		}
		else
			throw new Error(msg.getMsgText("jsdoMSG001", "remove()"));				
	}; 	    
    
    this.getId = function () {
		if (this._defaultTableRef)
			return this._defaultTableRef.getId();
		throw new Error(msg.getMsgText("jsdoMSG001", "getId()"));		
    };    
    
    /*
     * Finds a record in the JSDO memory using the specified function to determine the record.
     */    
    this.find = function (fn) {
		if (this._defaultTableRef)
			return this._defaultTableRef.find(fn);
		throw new Error(msg.getMsgText("jsdoMSG001", "find()"));		
    };     
    
	this.foreach = function(fn) {
		if (this._defaultTableRef)
			return this._defaultTableRef.foreach(fn);
		throw new Error(msg.getMsgText("jsdoMSG001", "foreach()"));		
	};
		
	this.setSortFields = function(sortFields) {
		if (this._defaultTableRef)
			return this._defaultTableRef.setSortFields(sortFields);
		throw new Error(msg.getMsgText("jsdoMSG001", "setSortFields()"));		
	};		
	
	this.setSortFn = function(fn) {
		if (this._defaultTableRef)
			return this._defaultTableRef.setSortFn(fn);
		throw new Error(msg.getMsgText("jsdoMSG001", "setSortFn()"));
	};	
	
	this.sort = function(arg1) {
		if (this._defaultTableRef)
			return this._defaultTableRef.sort(arg1);
		throw new Error(msg.getMsgText("jsdoMSG001", "sort()"));		
	};	
	
	/*
	 * Loads data from the HTTP resource.
	 */
	this.fill = function () {
		var objParam;

		// Process parameters
		if (arguments.length != 0) {
			// Call to fill() has parameters
			switch(typeof(arguments[0])) {
			case 'function':
				throw new Error(msg.getMsgText("jsdoMSG024", "JSDO", "fill()"));				
			default:
				// fill( string);
				var filter;
				if (arguments[0] == null) {
					filter = "";
				}
				else if (typeof(arguments[0]) == 'string') {
					filter = arguments[0];
				}
				else {
					throw new Error(msg.getMsgText("jsdoMSG025", "JSDO", "fill()"));					
				}
				objParam = { filter: filter };
				break;
			}
		}
		else {
			// fill();			
			objParam = null;
		}

		var xhr = new XMLHttpRequest();
		
		var request = {
			xhr : xhr,
			jsdo : this,
			objParam : objParam
		};
		
		xhr.request = request;
		
		xhr.jsdo = this;
		
		xhr.onSuccessFn = this._fillSuccess;
		xhr.onErrorFn = this._fillError;
		xhr.onCompleteFn = this._fillComplete;
		xhr.onreadystatechange = this.onReadyStateChangeGeneric;
		
		this.trigger("beforeFill", this, request);

		if (this._resource) {
			if (typeof(this._resource.generic.read) == "function") {
				xhr.objParam = objParam;
				this._resource.generic.read(xhr, this._async);
			}
			else {
				throw new Error("JSDO: READ operation is not defined.");
			}
		}
		else {
			this._session._openRequest(xhr, 'GET', this.url, this._async);
			xhr.send(null);
		}
	};

	/*
	 * Executes a CRUD operation using the built-in API.
	 */
	this._execGenericOperation = function(
		operation, objParam, request, onCompleteFn, onSuccessFn, onErrorFn) {

		var xhr = new XMLHttpRequest();
		request.xhr = xhr;
		request.jsdo = this;
		request.objParam = objParam;
		request.operation = operation;
		xhr.jsdo = this;
		xhr.onCompleteFn = onCompleteFn;
		xhr.onSuccessFn = onSuccessFn;
		xhr.onErrorFn = onErrorFn;
		xhr.onreadystatechange = this.onReadyStateChangeGeneric;
		xhr.request = request;

		var operationStr;
		switch(operation) {
		case progress.data.JSDO._OP_READ:
		case progress.data.JSDO._OP_CREATE:
		case progress.data.JSDO._OP_UPDATE:
		case progress.data.JSDO._OP_DELETE:
			operationStr = PROGRESS_JSDO_OP_STRING[operation];
			break;
		default:
			throw new Error("JSDO: Unexpected operation " + operation + " in HTTP request.");
		}

		if (this._resource) {
			if (typeof(this._resource.generic[operationStr]) == "function") {
				xhr.objParam = objParam;
				this._resource.generic[operationStr](xhr, this._async);
			}
			else {
				throw new Error("JSDO: " + operationStr.toUpperCase() + " operation is not defined.");
			}
		}
	};

	this._undefWorkingRecord = function () {
		// Set record property
		for (var buf in this._buffers) {			
			this._buffers[buf]._setRecord( null );
		}				
	};
	
	/*
	 * Saves changes in the JSDO. Save any outstanding changes for CREATES, UPDATE, and DELETEs
	 */
	this.saveChanges = function () {
		if (!this._hasCUDOperations)
			throw new Error(msg.getMsgText("jsdoMSG026"));		
		
		this.trigger("beforeSaveChanges", this);
		
		if (this._dataSetName)
			this._syncDataSet();
		else
			this._syncSingleTable();		
	};

	/*
	 * Synchronizes changes for a TableRef
	 * @param operation		HTTP operation to be performed
	 * @param tableRef		Handle to the TableRef
	 * @param batch 		Optional. batch information associated with the sync operation.  If not specified a new one will be created.  Used for saving datasets.
	 */
	this._syncTableRef = function(operation, tableRef, batch) {
		if (tableRef._visited) return;
		tableRef._visited = true;


		//ensure batch object is sane 
		if (!batch) {
			batch = {
				operations : []
			};
		} else if (!batch.operations) {
			batch.operations = [];
		}

		// Before children
		// Create parent records before children
		switch(operation) {
		case progress.data.JSDO._OP_CREATE:
			for (var i = 0; i < tableRef._added.length; i++) {
            	var id = tableRef._added[i];
				var jsrecord = tableRef._findById(id, false);

				if (!jsrecord) continue;
				if (tableRef._processed[id]) continue;
				tableRef._processed[id] = jsrecord.data;

				var jsonObject;				
				if (this.isDataSet()) {
					jsonObject = {};
					jsonObject[tableRef._name] = [];
					jsonObject[tableRef._name].push(jsrecord.data); 
				}
				else
					jsonObject = jsrecord.data;
				
				var request = {
					operation : operation,
					batch : batch,
					jsrecord : jsrecord,
					jsdo : this
				};
				batch.operations.push(request);
				
				jsrecord._tableRef.trigger("beforeCreate", this, jsrecord, request);
				this.trigger("beforeCreate", this, jsrecord, request);
				
				this._execGenericOperation(
					progress.data.JSDO._OP_CREATE, jsonObject, request, this._createComplete, this._createSuccess, this._createError);
			}
			break;
		case progress.data.JSDO._OP_UPDATE:
			for (var id in tableRef._changed) {
				var jsrecord = tableRef._findById(id, false);

				if (!jsrecord) continue;
				if (tableRef._processed[id]) continue;
				tableRef._processed[id] = jsrecord.data;

				var jsonObject;				
				if (this.isDataSet()) {
					jsonObject = {};
					jsonObject[tableRef._name] = [];
					jsonObject[tableRef._name].push(jsrecord.data); 
				}
				else
					jsonObject = jsrecord.data;				
				
				var request = {
					jsrecord : jsrecord,
					operation : operation,
					batch : batch,
					jsdo : this
				};
				batch.operations.push(request);
				
				jsrecord._tableRef.trigger("beforeUpdate", this, jsrecord, request);
				this.trigger("beforeUpdate", this, jsrecord, request);
				
				this._execGenericOperation(
					progress.data.JSDO._OP_UPDATE, jsonObject, request, this._updateComplete, this._updateSuccess, this._updateError);
			}
			break;
		}

		// Call _syncTableRef on child tables
		for (var i = 0; i < tableRef._children.length; i++) {
			var childTableName = tableRef._children[i];
			this._syncTableRef(
				operation, this._buffers[childTableName], batch);
		}

		// After children
		// Delete parent records after children

		if (operation == progress.data.JSDO._OP_DELETE) {
			for (var i = 0; i < tableRef._deleted.length; i++) {
            	var id = tableRef._deleted[i]._id;
            	var jsrecord = tableRef._deleted[i];

				if (!jsrecord) continue;
				tableRef._processed[id] = jsrecord.data;

				var jsonObject;				
				if (this.isDataSet()) {
					jsonObject = {};
					jsonObject[tableRef._name] = [];
					jsonObject[tableRef._name].push(jsrecord.data); 
				}
				else
					jsonObject = jsrecord.data;				
				
				var request = {
					batch : batch,
					jsrecord : jsrecord,
					operation : operation,
					jsdo : this
				};
				
				batch.operations.push(request);
				
				jsrecord._tableRef.trigger("beforeDelete", this, jsrecord, request);
				this.trigger("beforeDelete", this, jsrecord, request);
				
				this._execGenericOperation(
					progress.data.JSDO._OP_DELETE, jsonObject, request, this._deleteComplete, this._deleteSuccess, this._deleteError);
			}
		}
	};

	/*
	 * Synchronizes changes for a DataSet
	 */
	this._syncDataSet = function() {
		
		var batch = {
			operations : []
		};

		// Process buffers
		// Synchronize deletes
		for (var buf in this._buffers) { this._buffers[buf]._visited = false; }
		for (var buf in this._buffers) {
			var tableRef = this._buffers[buf];
			this._syncTableRef(
				progress.data.JSDO._OP_DELETE, tableRef, batch);
		}

		// Synchronize adds
		for (var buf in this._buffers) { this._buffers[buf]._visited = false; }
		for (var buf in this._buffers) {
			var tableRef = this._buffers[buf];
			this._syncTableRef(
				progress.data.JSDO._OP_CREATE, tableRef, batch);
		}

		// Synchronize updates
		for (var buf in this._buffers) { this._buffers[buf]._visited = false; }
		for (var buf in this._buffers) {
			var tableRef = this._buffers[buf];
			this._syncTableRef(
				progress.data.JSDO._OP_UPDATE, tableRef, batch);
		}
 
		for (var buf in this._buffers) {
			var tableRef = this._buffers[buf];
			tableRef._processed = [];
			tableRef._added = [];
			tableRef._changed = {};
			tableRef._deleted = [];
		}
	};


	/*
	 * Synchronizes changes for a single table
	 */
	this._syncSingleTable = function() {
		if (!this._defaultTableRef) return;
		var tableRef = this._defaultTableRef;
		
		var batch = {
			operations : []
		};

		var fireAfterSaveChanges = false;
		
        // Skip delete for records that were added
        // mark them as processed
		var addedRecords = {};
		for(var i = 0; i < tableRef._added.length; i++) {
			var id = tableRef._added[i];			
			addedRecords[id] = id;
		}
  		for(var i = 0; i < tableRef._deleted.length; i++) {
            var jsrecord = tableRef._deleted[i];
            if (!jsrecord) continue;
            
            var id = jsrecord.data._id;            
            if (addedRecords[id]) {
            	// Set request object
            	// Properties async, fnName, objParam, and response are not set when the HTTP request is suppressed 
                var request = {
                		success: true,
                    	xhr : undefined,
                    	operation : progress.data.JSDO._OP_DELETE,
        				batch : batch,
        				jsrecord : jsrecord,
        				jsdo : this
        			};
                batch.operations.push(request);
                tableRef._processed[id] = jsrecord.data;
                
                var jsdo = request.jsdo;
                try {
                	request.jsrecord._tableRef.trigger("afterDelete", jsdo, request.jsrecord, request.success, request);
                	jsdo.trigger("afterDelete", jsdo, request.jsrecord, request.success, request);
                } finally {
                	request.complete = true;    		
                }                

                fireAfterSaveChanges = true;                
            }
  		}
  		addedRecords = null;  		
		
		// Synchronize deletes
  		for(var i = 0; i < tableRef._deleted.length; i++) {
            var jsrecord = tableRef._deleted[i];
            if (!jsrecord) continue;
            
            var id = jsrecord.data._id;                        
			if (tableRef._processed[id]) continue;            
            
            tableRef._processed[id] = jsrecord.data;
            fireAfterSaveChanges = false;            

            var xhr = new XMLHttpRequest();
            xhr.jsdo = this;
            
            var request = {
            	xhr : xhr,
            	operation : progress.data.JSDO._OP_DELETE,
				batch : batch,
				jsrecord : jsrecord,
				jsdo : this
			};
            batch.operations.push(request);
            xhr.onCompleteFn = this._deleteComplete;
            xhr.onSuccessFn = this._deleteSuccess;
            xhr.onErrorFn = this._deleteError;
            xhr.onreadystatechange = this.onReadyStateChangeGeneric;
			xhr.request = request;

			jsrecord._tableRef.trigger("beforeDelete", this, jsrecord, request);
			this.trigger("beforeDelete", this, jsrecord, request);			
			
			if (this._resource) {
				if (typeof(this._resource.generic["delete"]) == "function") {
					xhr.objParam = jsrecord.data;
					this._resource.generic["delete"](xhr, this._async);
				}
				else {
					throw new Error("JSDO: DELETE operation is not defined.");
				}
			}
			else {
            	this._session._openRequest(xhr, 'DELETE', this.url + '/' + id, true);
    	    	xhr.send(null);
			}
		}

		// Synchronize adds
		for(var i = 0; i < tableRef._added.length; i++) {
			var id = tableRef._added[i];
			var jsrecord = tableRef._findById(id, false);

			if (!jsrecord) continue;
			if (tableRef._processed[id]) continue;
			tableRef._processed[id] = jsrecord.data;
            fireAfterSaveChanges = false;			

			var xhr = new XMLHttpRequest();
			xhr.jsdo = this;
			var request = {
				xhr : xhr,
				jsrecord : jsrecord,
				batch : batch,
				operation : progress.data.JSDO._OP_CREATE,
				jsdo : this
			};
            batch.operations.push(request);
            xhr.onCompleteFn = this._createComplete;
            xhr.onSuccessFn = this._createSuccess;
            xhr.onErrorFn = this._createError;
			xhr.onreadystatechange = this.onReadyStateChangeGeneric;
			xhr.request = request;
			
			jsrecord._tableRef.trigger("beforeCreate", this, jsrecord, request);
			this.trigger("beforeCreate", this, jsrecord, request);

			if (this._resource) {
				if (typeof(this._resource.generic.create) == "function") {
					xhr.objParam = jsrecord.data;
					this._resource.generic.create(xhr, this._async);
				}
				else {
					throw new Error("JSDO: CREATE operation is not defined.");
				}
			}
			else {
				this._session._openRequest(xhr, 'POST', this.url, true);
				xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8");
				var input = JSON.stringify(jsrecord.data);
				xhr.send(input);
			}
		}

		// Synchronize updates
		for(var id in tableRef._changed) {
			var jsrecord = tableRef._findById(id, false);

			if (!jsrecord) continue;
			if (tableRef._processed[id]) continue;
			tableRef._processed[id] = jsrecord.data;
            fireAfterSaveChanges = false;			

			var xhr = new XMLHttpRequest();
			var request = {
				xhr : xhr,
				jsrecord : jsrecord,
				operation : progress.data.JSDO._OP_UPDATE,
				batch : batch,
				jsdo : this,
			};
			xhr.request = request;
			xhr.jsdo = this;
            batch.operations.push(request);
            xhr.onCompleteFn = this._updateComplete;
            xhr.onSuccessFn = this._updateSuccess;
            xhr.onErrorFn = this._updateError;
			xhr.onreadystatechange = this.onReadyStateChangeGeneric;

			jsrecord._tableRef.trigger("beforeUpdate", this, jsrecord, request);
			this.trigger("beforeUpdate", this, jsrecord, request);
			
			if (this._resource) {
				if (typeof(this._resource.generic.update) == "function") {
					xhr.objParam = jsrecord.data;
					this._resource.generic.update(xhr, this._async);
				}
				else {
					throw new Error("JSDO: UPDATE operation is not defined.");
				}
			}
			else {
				this._session._openRequest(xhr, 'PUT', this.url + '/' + id, this._async);
				xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8");
				var input = JSON.stringify(jsrecord.data);
				xhr.send(input);
			}
		}

		if (fireAfterSaveChanges) {
			var jsdo = this;
			var request = {
				batch : batch,
				success : true
			};
			jsdo._undefWorkingRecord();
			jsdo.trigger("afterSaveChanges", jsdo, request.success, request);
		}
		
		tableRef._processed = [];
		tableRef._added = [];
		tableRef._changed = {};
		tableRef._deleted = [];
	};

	/*
	 * Reads a JSON object into the JSDO memory.
	 */
    this.addRecords = function (jsonObject, addMode, keyFields, trackChanges) {
		if (this.isDataSet()) {
			if (jsonObject instanceof Array) {
				if (!this._defaultTableRef) {				
					throw new Error(msg.getMsgText("jsdoMSG998"));
				}
			}			
			else {
				if (jsonObject == null) {
					jsonObject = {};
				}					
			
				if (jsonObject[this._dataSetName]) {
					jsonObject = jsonObject[this._dataSetName]; 
				}
			}
			
			// Allow empty object in addRecords with MODE_EMPTY
			if (addMode != progress.data.JSDO.MODE_EMPTY) {
				if (Object.keys(jsonObject).length == 0)
					throw new Error(msg.getMsgText("jsdoMSG006"));             			
			}			
			
			var oldUseRelationships = this.useRelationships;
			// Turn off useRelationships since addRecords() does not use the working record			
			this.useRelationships = false;
			try {
				for (var buf in this._buffers) {
					// Read data for tables in JSON object
					if (jsonObject[this._buffers[buf]._name])
						this._addRecords(this._buffers[buf]._name, jsonObject, addMode, keyFields, trackChanges);
					else if (addMode == progress.data.JSDO.MODE_EMPTY) {
						this._buffers[this._buffers[buf]._name]._data = [];
						this._buffers[this._buffers[buf]._name]._index = {};
						this._buffers[this._buffers[buf]._name]._createIndex();					
					}    			
				}
			} finally {
				// Restore useRelationships
				this.useRelationships = oldUseRelationships;				
			}
		}    	
		else if (this._defaultTableRef) {
			this._addRecords(this._defaultTableRef._name, jsonObject, addMode, keyFields, trackChanges);    		
		}	    		
    };
    
    /*
     * Copies the fields of the source record to the target record.
     * Preserves the _id of the target record.
     */
    this._copyRecord = function (tableRef, source, target) {
    	for (var field in source) {
    		
    		if (typeof source[field] === 'object') {
    			var newObject = source[field] instanceof Array ? [] : {};
    			this._copyRecord(tableRef, source[field], newObject);
    			target[field] = newObject;
    		}
    		else
    			target[field] = source[field];
    	}
    };
    
    this._addRecords = function (tableName, jsonObject, addMode, keyFields, trackChanges) {
    	if (typeof(tableName) != 'string')
    		throw new Error(msg.getMsgText("jsdoMSG020"));    	    	
    	if (!addMode)
    		throw new Error(msg.getMsgText("jsdoMSG021"));

		switch (addMode) {
		case progress.data.JSDO.MODE_APPEND:			
		case progress.data.JSDO.MODE_EMPTY:			
		case progress.data.JSDO.MODE_MERGE:				
		case progress.data.JSDO.MODE_REPLACE:						
			break;
		default:
			throw new Error(msg.getMsgText("jsdoMSG022"));
			break;
		}
    	    	
    	if (!keyFields)
    		keyFields = [];
    	else { 
    		if (!(keyFields instanceof Array) && (typeof(keyFields) == 'object')) {
    			if (keyFields[tableName]) {
    				keyFields = keyFields[tableName];
    			}
    			else {
    				keyFields = [];
    			}
    		}
    	}
    	
		if (!(keyFields instanceof Array)) {
			throw new Error(msg.getMsgText("jsdoMSG008"));			
		}    	

		// Check that the specified field names are in the schema
		if (this._buffers[tableName]._fields) {
			for ( var i = 0; i < keyFields.length; i++) {
				var field = this._buffers[tableName]._fields[keyFields[i].toLowerCase()]; 
				if (field == undefined) {
					throw new Error(msg.getMsgText("jsdoMSG009", keyFields[i]));				
				}
				else {
					keyFields[i] = field.name; 					
				}
			}			
		}		
		
    	trackChanges = trackChanges ? true : false;
    	
    	if (tableName) {    		
    		if (!(jsonObject instanceof Array)) {
        		var data = null;
        		
            	if (jsonObject == null) {
            		jsonObject = {};
            	}
        		
            	if (this.isDataSet()) {
            		if (jsonObject[this._dataSetName])
            			data = jsonObject[this._dataSetName][tableName];
            		else if (jsonObject[tableName])
            			data = jsonObject[tableName];
            	} else {
            		if (this._dataProperty)
            			data = jsonObject[this._dataProperty];
            		else if (jsonObject.data)
            			data = jsonObject.data;
            	}        		

            	if (data instanceof Array) {
            		jsonObject = data;
            	}
            	else if ((addMode == progress.data.JSDO.MODE_EMPTY)
            			&& (typeof (jsonObject) == 'object')
            			&& (Object.keys(jsonObject).length == 0)) {
            		jsonObject = []; // Allow empty object in addRecords with
            		// MODE_EMPTY
            	}
        	}
    		
    		if (!(jsonObject instanceof Array)) {
    			throw new Error(msg.getMsgText("jsdoMSG005", tableName));
    		}

			try {
				this._buffers[tableName]._sortRecords = false;				
    			if (keyFields.length == 0 || addMode == progress.data.JSDO.MODE_EMPTY) {
        			// Quick merge    				
    				if (addMode == progress.data.JSDO.MODE_EMPTY) {
    					this._buffers[tableName]._data = [];
    					this._buffers[tableName]._index = {};    					
    					this._buffers[tableName]._createIndex();    					
    				}    			
    				// APPEND, MERGE, REPLACE
    				for (var i=0; i < jsonObject.length; i++) {
    					this._buffers[tableName]._add(jsonObject[i], trackChanges, false);
    				}
    			}
    			else {
    				// Build temporary index
    				var tmpIndex;    				
    				
    				if (this._buffers[tableName]._data.length * jsonObject.length >= 10) {
    					tmpIndex = {};

    					for (var i=0; i < this._buffers[tableName]._data.length; i++) {
    						var record = this._buffers[tableName]._data[i];
    						if (!record) continue;

    						var key = this._buffers[tableName]._getKey(record, keyFields);
    						tmpIndex[key] = record;     						
    					} 
   					
    				}
    				else
    					tmpIndex = null; // Do not use an index
    				for (var i=0; i < jsonObject.length; i++) {
    					var match = false;
    					var record = null;

						// Check for duplicates    					
    					if (tmpIndex) {
    						var key = this._buffers[tableName]._getKey(jsonObject[i], keyFields);
    						record = tmpIndex[key];
    						match = (record != undefined);
    					}
    					else {
    						for (var j=0; j < this._buffers[tableName]._data.length; j++) {
    							record = this._buffers[tableName]._data[j];
    							if (!record) continue;
    							match = (this._buffers[tableName]._equalRecord(jsonObject[i], record, keyFields));
    							if (match) {
    								// Duplicate found
    								break;
    							}
    						}    						
    					}
    					
    					if (match) {
    						switch (addMode) {
							case progress.data.JSDO.MODE_APPEND:
								throw new Error (msg.getMsgText("jsdoMSG023"));
								break;
							case progress.data.JSDO.MODE_MERGE:	
								/* Ignore duplicate */
								break;
							case progress.data.JSDO.MODE_REPLACE:
								this._copyRecord(
										this._buffers[tableName], 
										jsonObject[i], record);
								break;
							default:
								break;
							}    						
    					}
    					else {
    						// Add record
        					var jsrecord = this._buffers[tableName]._add(jsonObject[i], trackChanges, false);
        					if (tmpIndex) {
        						var key = this._buffers[tableName]._getKey(jsrecord.data, keyFields);
        						tmpIndex[key] = jsrecord.data;
        					}
    					}

    				}
    				tmpIndex = null;
    			}
			}
			finally {
				this._buffers[tableName]._sortRecords = true;
				this._buffers[tableName]._sort();
				this._buffers[tableName]._createIndex();
			}
    	}
    };
    
    // private method to merge changes after a read operation
    
    this._mergeRead = function (jsonObject, xhr) {
		if (this.isDataSet() && this._dataSetName) {
			if (this._dataProperty) {
				var datasetBuffer = this._buffers[this._dataProperty]; 
				datasetBuffer._data = jsonObject[this._dataSetName][this._dataProperty];
				if (datasetBuffer.autoSort) {
					datasetBuffer._sort();
				}
				datasetBuffer._createIndex();
			}
			else {
				// Load data from JSON object into _data
				for (var buf in this._buffers) {
					var data = jsonObject[this._dataSetName][buf];
					data = data?data:[];
					this._buffers[buf]._data = data;
					if (this._buffers[buf].autoSort) {
						this._buffers[buf]._sort();
					}
					this._buffers[buf]._createIndex();
				}
				// Load nested data into _data
				if (this._numBuffers > 1) {
					for (var buf in this._buffers) {
						if (this._buffers[buf]._isNested
							&& this._buffers[buf]._parent
							&& this._buffers[this._buffers[buf]._parent]) {
							var srcData = this._buffers[this._buffers[buf]._parent]._data;
							var data = [];
							for (var i = 0; i < srcData.length; i++) {
								if (srcData[i][buf] != undefined) {
									for (var j = 0; j < srcData[i][buf].length; j++) {
										data.push(srcData[i][buf][j]);
									}
									delete srcData[i][buf];
								}
							}
							this._buffers[buf]._data = data;
							if (this._buffers[buf].autoSort) {
								this._buffers[buf]._sort();
							}
							this._buffers[buf]._createIndex();
						}
					}
				}
			}
		}
		else {
			if (jsonObject instanceof Array) {
				this._defaultTableRef._data = jsonObject;
			}
			else {
				if (this._dataProperty)
					this._defaultTableRef._data = jsonObject[this._dataProperty];
				else if (jsonObject.data)
					this._defaultTableRef._data = jsonObject.data;
				else {
					this._defaultTableRef._data = [];
					this._defaultTableRef._data[0] = jsonObject;
				}
			}
		}

		for (var buf in this._buffers) {
			if (this._buffers[buf].autoSort) {
				this._buffers[buf]._sort();
			}
			this._buffers[buf]._createIndex();
		}    	
    };
    
    /**
     * replace existing record data and index entry with new record data
     */
    this._mergeUpdateRecord = function (tableRef, recordId, record) {
		var index = tableRef._index[recordId].index;
		record._id = recordId;
		tableRef._data[index] = record;
		return record;
    };

    /*
     * Returns the array with the data from the specified dataObject. 
     */
    this._arrayFromDataObject = function(dataObject, tableRef) {
    	var data = undefined;
    	
    	if (this._dataSetName) {
   			if (dataObject[this._dataSetName])
   				data = dataObject[this._dataSetName][tableRef._name];
    	}
    	else {    	
    		// check if data returned as array
    		if (dataObject instanceof Array) {
    			data = dataObject;
    		} else {
    			// or if data property is set
    			if (this._dataProperty) {
    				data = dataObject[this._dataProperty];
    			} else if (dataObject.data) {
    				// or just try with 'data' as the data property name
    				data = dataObject.data;
    			}
    		}
    	}
    	
    	return data;
    };
    
    // private method to merge changes after a save operation
    this._mergeUpdate = function (jsonObject, xhr) {
		// Update dataset with changes from server
    	if (this._dataSetName) {
    		// only updates the specified record
    		var tableRef = xhr.request.jsrecord._tableRef;
    		var data = this._arrayFromDataObject(jsonObject, tableRef);
    		
    		if (data instanceof Array) {
    			if (data.length > 1) {
    				xhr.request.success = false;
					throw new Error(msg.getMsgText("jsdoMSG100"));
				}
					
				for (var i = 0; i < data.length; i++) {
					var recordId = xhr.request.jsrecord.getId();
			        	
			        if (!recordId) {
			        	return;
			        }
			    		
			        var record = this._mergeUpdateRecord(tableRef, recordId, data[i]);
			        xhr.request.jsrecord = new progress.data.JSRecord(tableRef, record);
				}
			}    		
    	} else {
    		// update single record with changes from server
			var tableRef = this._defaultTableRef; 
    		var data = this._arrayFromDataObject(jsonObject);
    		
			if (data instanceof Array) {
				if (data.length > 1) {
					xhr.request.success = false;
					throw new Error(msg.getMsgText("jsdoMSG100"));
				}
				
				for (var i = 0; i < data.length; i++) {
		        	var recordId = xhr.request.jsrecord.getId();
		        	
		        	if (!recordId) {
		        		return;
		        	}
		        	
					var record = this._mergeUpdateRecord(tableRef, recordId, data[i]);
					xhr.request.jsrecord = new progress.data.JSRecord(tableRef, record);
				}
			}
    	}
    };
    
    this._fillSuccess = function (jsdo, success, request) {
    	var xhr = request.xhr;
		jsdo._mergeRead(request.response, xhr);
				
		// Set working record
		for (var buf in jsdo._buffers) {
			if (!jsdo._buffers[buf]._parent || !jsdo.useRelationships) {
				jsdo._buffers[buf]._setRecord ( jsdo._buffers[buf]._findFirst() );							
			}
		}							
    };
    
    this._fillComplete = function (jsdo, success, request) {
    	jsdo.trigger("afterFill", jsdo, request.success, request);
    };
    
    this._fillError = function (jsdo, success, request) {
		for (var buf in jsdo._buffers) {
			jsdo._buffers[buf]._data = [];
			jsdo._buffers[buf]._index = {};
			jsdo._buffers[buf]._createIndex();			
		}    	
    };
    
    this._deleteComplete = function (jsdo, success, request) {
    	var xhr = request.xhr;
    	try {
    		request.jsrecord._tableRef.trigger("afterDelete", jsdo, request.jsrecord, request.success, request);
        	jsdo.trigger("afterDelete", jsdo, request.jsrecord, request.success, request);
    	} finally {
                request.complete = true;
        	jsdo._checkSaveComplete(xhr);    		
    	}
    };
    
    this._deleteSuccess = function (jsdo, success, request) {    	 
		var data = jsdo._arrayFromDataObject(request.response, request.jsrecord._tableRef);		
		if (data instanceof Array) {
			if (data.length > 1) {
				request.success = false;
				throw new Error(msg.getMsgText("jsdoMSG100"));
			}    	
		}
    	
    	// Clear before image
		delete request.jsrecord._tableRef._beforeImage[request.jsrecord.data._id];
		// End - Clear before image
    };
    
    this._deleteError = function (jsdo, success, request) {
    	// Restore before image
		var tableRef = request.jsrecord._tableRef;    	
    	var record = tableRef._beforeImage[request.jsrecord.data._id];
    	
    	// Before image points to an existing record    	
    	if (record) {    		
    		var index = record._index;
    		delete record._index;
    		if ((index != undefined) && (tableRef._data[index] == null)) {
    			tableRef._data[index] = record;
    		}
    		else {
    			tableRef._data.push(record);
    			index = tableRef._data.length - 1;
    		}
    		tableRef._index[request.jsrecord.data._id] = new progress.data.JSIndexEntry(index);
    	}
		delete tableRef._beforeImage[request.jsrecord.data._id];    	
        // End - Restore before image
    };
    
    this._createComplete = function (jsdo, success, request) {
    	var xhr = request.xhr;
    	try {
    		request.jsrecord._tableRef.trigger("afterCreate", jsdo, request.jsrecord, request.success, request);
        	jsdo.trigger("afterCreate", jsdo, request.jsrecord, request.success,  request );
    	} finally {
        	request.complete = true;
        	jsdo._checkSaveComplete(xhr);
    	}
    };
    
    this._createSuccess = function (jsdo, success, request) {
    	var xhr = request.xhr;
		var record = request.response;
		jsdo._mergeUpdate(record, xhr);
    	// Clear before image
		delete request.jsrecord._tableRef._beforeImage[request.jsrecord.data._id];
		// End - Clear before image
    };
    
    this._createError = function (jsdo, success, request) {
    	// Undo operation 
    	// Remove record from JSDO memory
		var tableRef = request.jsrecord._tableRef;
		delete tableRef._beforeImage[request.jsrecord.data._id];
		
		var index = tableRef._index[request.jsrecord.data._id].index;
		
		tableRef._data[index] = null;
		tableRef._hasEmptyBlocks = true;
		delete tableRef._index[request.jsrecord.data._id];
        // End - Undo operation
    };
    
    this._updateComplete = function (jsdo, success, request) {
    	var xhr = request.xhr;
    	try {
        	request.jsrecord._tableRef.trigger("afterUpdate", jsdo, request.jsrecord, request.success, request);
        	jsdo.trigger("afterUpdate", jsdo, request.jsrecord, request.success, request);
    	} finally {
    		request.complete = true;
        	jsdo._checkSaveComplete(xhr);
    		
    	}
    };
    
    // Check if all the xhr operations associated with the batch for which
    // this xhr object is related have completed (not necessarily to success).
    // If all XHR operations have completed this fires 'afterSaveChanges' event
    this._checkSaveComplete = function(xhr) {
    	if (xhr.request) {
        	var jsdo = xhr.request.jsdo;
        	var batch = xhr.request.batch;
        	if (jsdo && batch) {
        		if (jsdo._isBatchComplete(batch)) {
        			var success = jsdo._isBatchSuccess(batch);
        			var request = {
        				batch : batch,
        				success : success
        			};
        			jsdo._undefWorkingRecord();        			
        			jsdo.trigger("afterSaveChanges", jsdo, success, request);    			
        		}
        	}
    	}
    };
    
    /*
     * determine if a batch of XHR requests has completed in which all requests are successful
     */
    this._isBatchSuccess = function (batch) {
    	if (batch.operations) {
    		for (var i = 0; i < batch.operations.length; i++) {
    			if (!batch.operations[i].success) {
    				return false;
    			}
    		}	
    	}
    	return true;
    };    
    
    /*
     * determine if all XHR requests from the batch of saves have completed (not necessarily to success) 
     */
    this._isBatchComplete = function (batch) {
    	if (batch.operations) {
    		for (var i = 0; i < batch.operations.length; i++) {
    			var request = batch.operations[i];
    			// we have to check against the 'complete' flag because xhr.readyState might be set async by the browser
    			// while we're still in the middle of processing some other requests's response
    			if (!request.complete) {
    				return false;
    			}
    		}	
    	}
    	return true;
    };
    
    this._updateSuccess = function (jsdo, success, request) {
    	var xhr = request.xhr;
		jsdo._mergeUpdate(request.response, xhr);
		request.success = true;
    	// Clear before image
		delete request.jsrecord._tableRef._beforeImage[request.jsrecord.data._id];
		// End - Clear before image		
    };
    
    this._updateError = function (jsdo, success, request) {
		request.success = false;
				
    	// Restore before image
		var tableRef = request.jsrecord._tableRef;    	
    	var record = tableRef._beforeImage[request.jsrecord.data._id];
    	
    	// Before image points to an existing record    	
    	if (record) {
    		var index = tableRef._index[request.jsrecord.data._id].index;

    		tableRef._jsdo._copyRecord(tableRef, record, tableRef._data[index]);
    	}
		delete tableRef._beforeImage[request.jsrecord.data._id];    	
        // End - Restore before image
    };
    
	this.onReadyStateChangeGeneric = function () {
		var xhr = this;
		if (xhr.readyState == 4) {
			var request = xhr.request;

			/* try to parse response even if request is considered "failed" due to http status */
			try {
				request.response = JSON.parse(xhr.responseText);
				// in some cases the object back from appserver has a "response" property which represents
				// the real content of the JSON...happens when multiple output parameters are returned.
				// this of course assumes no one names their root object "response".
				if (request.response && request.response.response) {
					request.response = request.response.response;
				}
			} catch(e) {
				request.response = undefined;
			}			
			
			try {
				if ((xhr.status >= 200 && xhr.status < 300) || (xhr.status == 0 && xhr.responseText != "")) {
					request.success = true;

					xhr.jsdo._session._saveClientContextId( xhr );  // get the Client Context ID (AppServer ID)
					if ((typeof xhr.onSuccessFn) == 'function') {
						xhr.onSuccessFn(xhr.jsdo, request.success, request);
					}
					
				} else {
					request.success = false;
					if (xhr.status == 0) {
						request.exception = new Error(msg.getMsgText("jsdoMSG101"));						
					}
					if ((typeof xhr.onErrorFn) == 'function') {
						xhr.onErrorFn(xhr.jsdo, request.success, request);
					}
				}
			} catch(e) {
				request.exception = e;
				if ((typeof xhr.onErrorFn) == 'function') {
					xhr.onErrorFn(xhr.jsdo, request.success, request);
				}
			}
			
			if ((typeof xhr.onCompleteFn) == 'function') {
				xhr.onCompleteFn(xhr.jsdo, request.success, request);
			}
			
		}
	};

	// Load data
	if (autoFill)
		this.fill();

}; // End of JSDO

// Constants for progress.data.JSDO
if ((typeof Object.defineProperty) == 'function') {
	Object.defineProperty(progress.data.JSDO, 'MODE_APPEND', {
		value : 1,
		enumerable : true
	});
	Object.defineProperty(progress.data.JSDO, 'MODE_EMPTY', {
		value : 2,
		enumerable : true
	});		
	Object.defineProperty(progress.data.JSDO, 'MODE_MERGE', {
		value : 3,
		enumerable : true
	});
	Object.defineProperty(progress.data.JSDO, 'MODE_REPLACE', {
		value : 4,
		enumerable : true
	});
} else {
	progress.data.JSDO.MODE_APPEND = 1;
	progress.data.JSDO.MODE_EMPTY = 2;		
	progress.data.JSDO.MODE_MERGE = 3;
	progress.data.JSDO.MODE_REPLACE = 4;
}

/* CRUD */
progress.data.JSDO._OP_CREATE = 1,
progress.data.JSDO._OP_READ   = 2,
progress.data.JSDO._OP_UPDATE  = 3,
progress.data.JSDO._OP_DELETE  = 4;

// setup inheritance for JSDO
progress.data.JSDO.prototype = new progress.util.Observable();
progress.data.JSDO.prototype.constructor = progress.data.JSDO;

// setup inheritance for table reference
progress.data.JSTableRef.prototype = new progress.util.Observable();
progress.data.JSTableRef.prototype.constructor = progress.data.JSTableRef;

if (typeof progress.ui == 'undefined')
	progress.ui = {};
progress.ui.UITableRef = function UITableRef(tableRef) {
	this._tableRef = tableRef;
	this._listview = null;
	this._detailPage = null;
	this._listviewContent = undefined;

	this.addItem = function(format) {
		var detailForm;

		if (!this._tableRef.record)
			throw new Error(msg.getMsgText("jsdoMSG002", this._name));		

		if (!this._listview) return;
 
		format = format ? format : this._listview.format;
		detailForm = (this._detailPage && this._detailPage.name) ? this._detailPage.name : "";

		if (this._listviewContent === undefined) {
			this.clearItems();
		}
		var text = this._listview.itemTemplate ? this._listview.itemTemplate : progress.ui.UIHelper._itemTemplate;

		text = text.replace( new RegExp('{__format__}', 'g'), format);
		text = text.replace( new RegExp('{__id__}', 'g'), this._tableRef.record.data._id);
		text = text.replace( new RegExp('{__page__}', 'g'), detailForm);

		for (field in this._tableRef.record.data) {
			var value = this._tableRef.record.data[field];
			text = text.replace( new RegExp('{' + field + '}', 'g'), value != null ? value : "");
		}

		this._listviewContent += text;
	};

	this.clearItems = function() {
		if (this._listview) {
			this._listviewContent = ''; 
			var listviewElement = document.getElementById(this._listview.name);
			if (listviewElement) {
				listviewElement.innerHTML = '';
			}
		}
	};

	this._getFormFieldValue = function (fieldName, detailPageName) {
		var value = null;

		if (detailPageName == undefined) {
            if (this._detailPage && this._detailPage.name)
                detailPageName = this._detailPage.name;
        }
        
		if (typeof($) == 'function' && detailPageName) {
			field = $("#" + detailPageName + " #" + fieldName);
			if (!field || field.length == 0)
				field = $("#" + detailPageName + ' [dsid="' + fieldName + '"]');
			if (field && field.length == 1)
				value = field.val();
		}
		else {
			field = document.getElementById(fieldName);
			if (field) {
				value = field.value;
			}
		}

		return value;
	};

	this._setFormField = function (fieldName, value, detailPageName) {
		var field = null;
        
		if (detailPageName == undefined) {
            if (this._detailPage && this._detailPage.name)
                detailPageName = this._detailPage.name;
        }
        
		if (typeof($) == 'function' && detailPageName) {
			field = $("#" + detailPageName + " #" + fieldName);
			if (!field || field.length == 0)
				field = $("#" + detailPageName + ' [dsid="' + fieldName + '"]');
			if (field && field.length == 1)
				field.val(value);
		}
		else {
			field = document.getElementById(fieldName);
			if (field) {
				field.value = value;
			}
		}
	};

	/*
	 * Assigns field values from the form.
	 */	
    this.assign = function (detailPageName) {
		if (!this._tableRef.record)
			throw new Error(msg.getMsgText("jsdoMSG002", this._tableRef._name));
		if ((arguments.length != 0) && (typeof detailPageName != 'string'))
			throw new Error(msg.getMsgText("jsdoMSG024", "UIHelper", "assign()"));				

		// Ensure creation of before image record
		this._tableRef.record.assign(null);

		var fieldName;
        var schema = this._tableRef.getSchema();
		for(var i = 0; i < schema.length; i++) {
			fieldName = schema[i].name;
            if (fieldName == '_id') continue;			
			var value = this._getFormFieldValue(fieldName, detailPageName);
			if (value)
				this._tableRef.record.data[fieldName] = value;
		}

		// Ensure order of record
		this._tableRef.record._sortRecord();		
		
		return true;
	};

    this.display = function (pageName) {
		if (!this._tableRef.record)
			throw new Error(msg.getMsgText("jsdoMSG002", this._tableRef._name));		

		// Display record to form
        var schema = this._tableRef.getSchema();
        for(var i = 0; i < schema.length; i++) {
			this._setFormField(schema[i].name, this._tableRef.record.data[schema[i].name], pageName);
        }
		this._setFormField('_id', this._tableRef.record.data._id, pageName);
    };

	this.showListView = function () {
		if (!this._listview) return;

		var uiTableRef = this;		
		var listviewElement;
		if (typeof($) == 'function') {
			listviewElement = $("#"+this._listview.name);
			if (listviewElement && listviewElement.length == 1) {
				listviewElement.html(this._listviewContent ? this._listviewContent : '');
				try {
					listviewElement.listview("refresh");
				}
				catch(e) {
					// Workaround for issue with JQuery Mobile throwning exception on refresh
				}
			}

			if (this._listview.autoLink) {
				// Add trigger for 'tap' event to items
				$("#" + this._listview.name + " li").each (
					function (index) {
					$(this).bind('click',
					function (event,ui) {
						var jsrecord = uiTableRef.getListViewRecord(this);
						uiTableRef.display();
						if (typeof(uiTableRef._listview.onSelect) == 'function') {
                            uiTableRef._listview.onSelect(event, this, jsrecord);
                        }                        
					});
				});
			}
		}
		else {
			listviewElement = document.getElementById(this._listview.name);
			if (listviewElement) {
				listviewElement.innerHTML = this._listviewContent;
			}
			
			if (this._listview.autoLink) {
				var element = document.getElementById(this._listview.name);
				if (element && element.childElementCount > 0) {
					for (var i = 0; i < element.children.length; i++) {
						element.children[i].onclick = function() {
							var jsrecord = uihelper.getListViewRecord(this);
							uihelper.display();
							if (typeof(uiTableRef._listview.onSelect) == 'function') {
                            	uiTableRef._listview.onSelect(event, this, jsrecord);
                        	}                                                    
						};
					}
				}	  									
			}
		}
		
		this._listviewContent = undefined;		
	};

	this.getFormFields = function (fields) {
		if (!this._tableRef._schema)
			return '';
		if (!(fields instanceof Array))
			fields = null;
		else {
			var tmpFields = {};
			for (var i = 0; i < fields.length; i++) {
				tmpFields[fields[i]] = fields[i];
			}
			fields = tmpFields;
		}
		var htmltext;
		if (!fields || fields['_id']) {
			htmltext = '<input type="hidden" id="_id" name="_id" value="" />';
		}
		else
			htmltext = '';
		htmltext += '<fieldset data-role="controlgroup">';
		
        for(var i = 0; i < this._tableRef._schema.length; i++) {
            var fieldName = this._tableRef._schema[i].name;
            if (fieldName == '_id') continue;
			if (fields && fields[fieldName] === undefined) continue;
			var fieldLabel = this._tableRef._schema[i].title ? this._tableRef._schema[i].title : this._tableRef._schema[i].name;
			var text = (this._detailPage && this._detailPage.fieldTemplate) ? this._detailPage.fieldTemplate : progress.ui.UIHelper._fieldTemplate;
			text = text.replace( new RegExp('{__label__}', 'g'), fieldLabel);
			text = text.replace( new RegExp('{__name__}', 'g'), this._tableRef._schema[i].name);
            htmltext += text;
        }
        htmltext += '</fieldset>';
		fields = null;
        return htmltext;
    };

	this.getListViewRecord = function(htmlIElement) {
		var id = htmlIElement.getAttribute('data-id');
		return this._tableRef.findById(id);		
	};
	
	this.getFormRecord = function(detailPageName) {
		var id = this._getFormFieldValue('_id', detailPageName);
		return this._tableRef.findById(id);
	};

	this._getIdOfElement = function(name) {
		if (typeof($) == 'function') {
			var element = $("#" + name);
			if (!element || element.length == 0) {
				element = $('[dsid="' + name + '"]');
				if (element && element.length == 1) {
					var id = element.attr("id");
					if (id)
						return id;
				}
			} 
		}
		return name;
	};

	this.setDetailPage = function setDetailPage(obj) { 
		if (!obj || (typeof(obj) != 'object'))
			throw new Error(msg.getMsgText("jsdoMSG012", arguments.callee.name, "object"));			
		if (!obj.name || (typeof(obj.name) != 'string'))
			throw new Error(msg.getMsgText("jsdoMSG012", arguments.callee.name, "name"));			
		this._detailPage = obj; 
		this._detailPage.name = this._getIdOfElement(this._detailPage.name);
	};
	this.setListView = function setListView(obj) {
		if (!obj || (typeof(obj) != 'object'))
			throw new Error(msg.getMsgText("jsdoMSG012", arguments.callee.name, "object"));			
		if (!obj.name || (typeof(obj.name) != 'string'))
			throw new Error(msg.getMsgText("jsdoMSG012", arguments.callee.name, "name"));			
		if (obj.format && (typeof(obj.name) != 'string'))
			throw new Error(msg.getMsgText("jsdoMSG012", arguments.callee.name, "format"));
		
		this._listview = obj;
		this._listview.name = this._getIdOfElement(this._listview.name);
		if (!this._listview.format) {
			if (typeof($) == 'function') {						
				for(var i = 0; i < this._tableRef._schema.length; i++) {
					var fieldName = this._tableRef._schema[i].name;
				
					field = $("#" + this._listview.name + ' [dsid="' + fieldName + '"]');
					if (field && field.length == 1) {
						field.html('{' + fieldName + '}');
					}
				}
			}
			var text = document.getElementById(this._listview.name).innerHTML;
			var pos = text.indexOf('<li ');
			if (pos != -1) {
				// Add data-id so that getListViewRecord() can obtain the _id of the record
				text = text.substring(0, pos) + '<li data-id="{__id__}"' + text.substring(pos+3);
			}
			this._listview.itemTemplate = text;
		}
	};

};

progress.ui.UIHelper = function UIHelper() {

	if ( typeof(arguments[0]) == "object" ) {
		var args = arguments[0];
    	for (var v in args) {
    		switch(v) {
    		case 'jsdo':
				this._jsdo = args[v];
				break;
    		default:
    			this[v] = args[v];
    		}
    	}
	}

	this._defaultUITableRef = null;
	this._uiTableRef = {};
	var cnt = 0;
	for (var buf in this._jsdo._buffers) {
		this[buf] = this._uiTableRef[buf] = new progress.ui.UITableRef(this._jsdo._buffers[buf]);
		if (!this._defaultUITableRef)
			this._defaultUITableRef = this._uiTableRef[buf];
		cnt++;
	}
	if (cnt != 1) {
		this._defaultUITableRef = null;
	}

    this.addItem = function (format) {
		if (this._defaultUITableRef) {
			this._defaultUITableRef.addItem(format);
		}
		else
			throw new Error(msg.getMsgText("jsdoMSG011", "addItem()"));				
	}; 

    this.clearItems = function () {
		if (this._defaultUITableRef) {
			this._defaultUITableRef.clearItems();
		}
		else
			throw new Error(msg.getMsgText("jsdoMSG011", "clearItems()"));				
	}; 

    this.assign = function (detailPageName) {
		if (arguments.length != 0)
			throw new Error(msg.getMsgText("jsdoMSG024", "UIHelper", "assign()"));				    	
		if (this._defaultUITableRef) {
			return this._defaultUITableRef.assign(detailPageName);
		}
		else
			throw new Error(msg.getMsgText("jsdoMSG011", "assign()"));				
	}; 

    this.display = function (detailPageName) {
		if (this._defaultUITableRef) {
			this._defaultUITableRef.display(detailPageName);
		}
		else
			throw new Error(msg.getMsgText("jsdoMSG011", "display()"));				
	}; 

    this.showListView = function () {
		if (this._defaultUITableRef) {
			this._defaultUITableRef.showListView();
		}
		else
			throw new Error(msg.getMsgText("jsdoMSG011", "showListView()"));				
	}; 

	this.getFormFields = function(fields) {
		if (this._defaultUITableRef) {
			return this._defaultUITableRef.getFormFields(fields);
		}
		else
			throw new Error(msg.getMsgText("jsdoMSG011", "getFormFields()"));				
	}; 

	this.getListViewRecord = function(htmlIElement) {	
		if (this._defaultUITableRef) {
			return this._defaultUITableRef.getListViewRecord(htmlIElement);
		}
		else
			throw new Error(msg.getMsgText("jsdoMSG011", "getListViewRecord()"));
	};
	
	this.getFormRecord = function(detailPageName) {
		if (this._defaultUITableRef) {
			return this._defaultUITableRef.getFormRecord(detailPageName);
		}
		else
			throw new Error(msg.getMsgText("jsdoMSG011", "getFormRecord()"));
	}; 	
	
	this.setDetailPage = function(obj) {
		if (this._defaultUITableRef)
			return this._defaultUITableRef.setDetailPage(obj);
		throw new Error(msg.getMsgText("jsdoMSG011", "setDetailPage()"));		
	};

	this.setListView = function(obj) {
		if (this._defaultUITableRef)
			return this._defaultUITableRef.setListView(obj);
		throw new Error(msg.getMsgText("jsdoMSG011", "setListView()"));		
	};

};
progress.ui.UIHelper._defaultItemTemplate = '<li data-theme="c" data-id="{__id__}"><a href="#{__page__}" class="ui-link" data-transition="slide">{__format__}</a></li>';
progress.ui.UIHelper._defaultFieldTemplate = '<div data-role="fieldcontain"><label for="{__name__}">{__label__}</label><input id="{__name__}" name="{__name__}" placeholder="" value="" type="text" /></div>';
progress.ui.UIHelper._itemTemplate = progress.ui.UIHelper._defaultItemTemplate;
progress.ui.UIHelper._fieldTemplate = progress.ui.UIHelper._defaultFieldTemplate;

progress.ui.UIHelper.setItemTemplate = function(template) {	
	progress.ui.UIHelper._itemTemplate = template ? template : progress.ui.UIHelper._defaultItemTemplate;
};

progress.ui.UIHelper.setFieldTemplate = function(template) {	
	progress.ui.UIHelper._fieldTemplate = template ? template : progress.ui.UIHelper._defaultFieldTemplate;
};

})();

//this is so that we can see the code in Chrome's Source tab when script is loaded via XHR
//@ sourceURL=progress.js
