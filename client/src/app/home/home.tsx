import * as React from 'react';
import { Link, Redirect, Route, HashRouter, Switch } from 'react-router-dom';
import { IAuthentication, Authentication } from '../../services/authentication';
import { asyncHandler } from '../../utils/async-handler';
import { updateState } from '../../utils/update-state';
import { Button } from '@blueprintjs/core';

export interface IHomeProps {
}

export interface IHomeState {


}

export class HomeUI extends React.Component<IHomeProps, IHomeState> {

    private authentication: IAuthentication = Authentication.getInstance(); //TODO: DI
    
    constructor(props: IHomeProps) {
        super(props);

        this.state = {
        };

        this.onClickSignOut = asyncHandler(this, this.onClickSignOut);
    }
    

    private async onClickSignOut(): Promise<void> {
        await this.authentication.signout();
    }

    
    render() {
        return (
            <div>
                <p>Home page</p>
                <div>
                    <Button
                        onClick={this.onClickSignOut}
                        >
                        SIGN OUT
                    </Button>
                </div>
                <div><Link to="/page1">Go to page 1</Link></div>
                <div><Link to="/page2">Go to page 2</Link></div>
            </div>
        );
    }
}