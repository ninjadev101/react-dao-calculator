import React, { useEffect } from 'react';
import { map, route, mount,  withView } from 'navi';
import { View } from 'react-navi';

import Navbar from 'components/Navbar';
import PageLayout from 'layouts/PageLayout';
import AppLayout from 'layouts/AppLayout';
import Landing from 'pages/Landing';
import Overview from 'pages/Overview';
import Borrow from 'pages/Borrow';
import Save from 'pages/Save';
import CDPDisplay from 'components/CDPDisplay';
import modals, { templates } from 'components/Modals';
import AwaitMakerAuthentication from 'components/AwaitMakerAuthentication';
import { ModalProvider } from 'providers/ModalProvider';
import { SidebarProvider } from 'providers/SidebarProvider';
import MakerProvider from 'providers/MakerProvider';
import MobileNav from 'components/MobileNav';
import { userSnapInit } from 'utils/analytics';
import useMaker from 'hooks/useMaker';
import useStore from 'hooks/useStore';
import { startWatcher } from './watch';
import { Routes } from 'utils/constants';


const withBorrowLayout = route =>
  hasNetwork(
    withView(async request => {
      const { network, testchainId, backendEnv } = request.query;
      const { viewedAddress, cdpId } = request.params;

      return (
        <MakerProvider
          network={network}
          testchainId={testchainId}
          backendEnv={backendEnv}
        >
          <RouteEffects network={network} />
          <AwaitMakerAuthentication>
            <ModalProvider modals={modals} templates={templates}>
              <SidebarProvider>
                <PageLayout
                  mobileNav={
                    <MobileNav viewedAddress={viewedAddress} cdpId={cdpId} />
                  }
                  navbar={<Navbar viewedAddress={viewedAddress} />}
                >
                  <View />
                </PageLayout>
              </SidebarProvider>
            </ModalProvider>
          </AwaitMakerAuthentication>
        </MakerProvider>
      );
    }, route)
  );

const withSaveLayout = route =>
  hasNetwork(
    withView(async request => {
      const { network, testchainId, backendEnv } = request.query;

      return (
        <MakerProvider
          network={network}
          testchainId={testchainId}
          backendEnv={backendEnv}
        >
          <RouteEffects network={network} />
          <AwaitMakerAuthentication>
            <ModalProvider modals={modals} templates={templates}>
              <AppLayout>
                <View />
              </AppLayout>
            </ModalProvider>
          </AwaitMakerAuthentication>
        </MakerProvider>
      );
    }, route)
  );

const hasNetwork = route =>
  map(request => {
    // if (networkIsUndefined(request)) {
    //   return redirect(`./?network=${networkNames[defaultNetwork]}`);
    // } else {
      return route;
    // }
  });

export default mount({
  '/': hasNetwork(
    route(async request => {
      const { testchainId, backendEnv } = request.query;
      const network = 'kovan';
      return {
        title: 'Landing',
        view: (
          <MakerProvider
            network={network}
            testchainId={testchainId}
            backendEnv={backendEnv}
          >
            <RouteEffects network={network} />
            <ModalProvider modals={modals} templates={templates}>
              <Landing />
            </ModalProvider>
          </MakerProvider>
        )
      };
    })
  ),

  [`/${Routes.BORROW}`]: withBorrowLayout(
    route(() => {
      return {
        title: 'Borrow',
        view: <Borrow />
      };
    })
  ),

  [`/${Routes.BORROW}/owner/:viewedAddress`]: withBorrowLayout(
    route(request => {
      const { viewedAddress } = request.params;
      return {
        title: 'Overview',
        view: <Overview viewedAddress={viewedAddress} />
      };
    })
  ),

  [`/${Routes.BORROW}/:cdpId`]: withBorrowLayout(
    map(request => {
      const { cdpId } = request.params;

      if (!/^\d+$/.test(cdpId))
        return route({ view: <div>invalid cdp id</div> });

      return route({
        title: 'CDP',
        view: <CDPDisplay cdpId={cdpId} />
      });
    })
  ),

  [`/${Routes.SAVE}`]: withSaveLayout(
    route(() => {
      return {
        title: 'Save',
        view: <Save />
      };
    })
  )
});

function networkIsUndefined(request) {
  const { query } = request;
  return query.network === undefined && query.testchainId === undefined;
}

function RouteEffects({ network }) {
  const { maker } = useMaker();
  const [, dispatch] = useStore();

  useEffect(() => {
    if (network !== 'mainnet' && window.location.hostname !== 'localhost') {}
      userSnapInit();
  }, [network]);

  useEffect(() => {
    if (!maker) return;
    const scs = maker.service('smartContract');
    startWatcher({
      rpcUrl: maker.service('web3').rpcUrl,
      multicallAddress: scs.getContractAddress('MULTICALL'),
      addresses: scs.getContractAddresses(),
      dispatch
    });
  }, [maker]);

  return null;
}
