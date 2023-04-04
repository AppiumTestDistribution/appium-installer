import inquirer from 'inquirer';

export default class Logger {
    constructor() {
        if(!Logger.instance) {
            Logger.instance = new inquirer.ui.BottomBar();
 
        }
    }

    getInstance() {
        return Logger.instance;
    }
}