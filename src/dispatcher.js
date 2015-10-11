import { Dispatcher } from 'flux';

export class AppDispatcher extends Dispatcher {

  constructor() {
    super();
    this.actionTypes = {
      ERROR: 'ERROR'
    };
  }

  error(err) {
    console.error(err);
    this.dispatch({
      actionType: this.actionTypes.ERROR,
      data: err
    });
  }

};

export var dispatcher = new AppDispatcher();
