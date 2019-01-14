import * as React from 'react';
import { Link, Redirect } from 'react-router-dom';
import { IAuthentication, Authentication } from '../../services/authentication';
import { asyncHandler } from '../../utils/async-handler';
import { updateState } from '../../utils/update-state';
import { Button } from '@blueprintjs/core';

export interface IHomeProps {
}

export interface IHomeState {
    signedin: boolean;
}

export class HomeUI extends React.Component<IHomeProps, IHomeState> {

    authentication: IAuthentication = Authentication.getInstance(); //TODO: DI.
    
    constructor(props: IHomeProps) {
        super(props);

        this.state = {
            signedin: true,
        };

        this.componentDidMount = asyncHandler(this, this.componentDidMount);
        this.onClickSignOut = asyncHandler(this, this.onClickSignOut);
    }
    
    async componentDidMount(): Promise<void> {
        await this.checkSignedIn();
    }

    private async checkSignedIn(): Promise<void> {
        console.log("Checking for signin!");
        const isSignedin = await this.authentication.isSignedIn();
        console.log("Signed in: " + isSignedin);

        if (isSignedin != this.state.signedin) {
            await updateState(this, { signedin: isSignedin });
        }
    }

    private async onClickSignOut(): Promise<void> {
        await this.authentication.signout();
        await updateState(this, { signedin: false });
    }
    
    render() {
        if (!this.state.signedin) {
            return <Redirect to="/auth/signin" />;
        }
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