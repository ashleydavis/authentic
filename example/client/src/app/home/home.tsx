import * as React from 'react';
import { IAuthentication, Authentication } from '../../services/authentication';
import { asyncHandler } from '../../utils/async-handler';
import { Button } from '@blueprintjs/core';
import { updateState } from '../../utils/update-state';

export interface IHomeProps {
}

export interface IHomeState {
    msg?: string;
}

export class HomeUI extends React.Component<IHomeProps, IHomeState> {

    private authentication: IAuthentication = Authentication.getInstance(); //TODO: DI
    
    constructor(props: IHomeProps) {
        super(props);

        this.state = {
        };

        this.componentDidMount = asyncHandler(this, this.componentDidMount);
        this.onClickSignOut = asyncHandler(this, this.onClickSignOut);
    }

    async componentDidMount() {
        const response = await this.authentication.get("/api/test2");
        await updateState(this, {
            msg: response.data.msg,
        });        
    }

    private async onClickSignOut(): Promise<void> {
        await this.authentication.signout();
    }

    render() {
        return (
            <div>
                <p>Home page</p>
                <div>
                    {this.state.msg}
                </div>
                <div>
                    <Button
                        onClick={this.onClickSignOut}
                        >
                        SIGN OUT
                    </Button>
                </div>
            </div>
        );
    }
}