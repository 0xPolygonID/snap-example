import { heading, panel, Panel, spinner } from '@metamask/snaps-ui';

export const confirmRpcDialog = async (
  content: Panel,
  type: any = 'confirmation',
) => {
  return snap.request({
    method: 'snap_dialog',
    params: {
      type,
      content,
    },
  });
};

export const loadingRpcDialog = async (content: Panel, type: any = 'alert') => {
  return snap.request({
    method: 'snap_dialog',
    params: {
      type,
      content: content ?? panel([heading('Please wait...'), spinner()]),
    },
  });
};
