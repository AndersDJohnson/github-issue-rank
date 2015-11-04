import { Dispatcher } from 'flux';

export class AppDispatcher extends Dispatcher {

  constructor() {
    super();
    this.actionTypes = {
      ERROR: 'ERROR',
      AUTH: 'AUTH'
    };
  }

  type(action, type) {
    return action.actionType && ((action.actionType === type) || (this.actionTypes[action.actionType] === type));
  }

  auth() {
    this.dispatch({
      actionType: this.actionTypes.AUTH
    });
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
