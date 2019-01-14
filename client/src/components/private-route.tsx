/**
 * Defines a private route that requires authentication.
 * If the user is not authenticated they are redirected to the sign-in screen.
 * 
 * https://reacttraining.com/react-router/web/example/auth-workflow
 */

import * as React from 'react';
import { Authentication, IAuthentication } from '../services/authentication';
import { Route, Redirect } from 'react-router';

export interface IPrivateRouteProps {
    //
    // The URL path for the route.
    //
    path: string;

    //
    // Set to true to match the path exactly.
    //
    exact?: boolean;
}

export class PrivateRoute extends React.Component<IPrivateRouteProps, {}> {

    private authentication: IAuthentication;

    constructor(props: IPrivateRouteProps) {
        super(props);

        //TODO: Would like to dependency inject these in the future.
        this.authentication = Authentication.getInstance();
    }

    render() {

        //todo: if (this.authentication.isSignedIn()) {
            // 
            // Already signed in, so render the actual component.
            //
            return (
                <Route 
                    path={this.props.path}
                    exact={this.props.exact}
                    >
                    {this.props.children}
                </Route>
            );
        /*
        }
        else {
            return <Redirect to="/auth/signin" />;
        }
        */
    }
}