import React, { forwardRef, memo } from 'react';
import { FlatList } from 'react-native';

const MemoizedFlatList = memo(
  forwardRef((props, ref) => <FlatList {...props} ref={ref} />),
  (prevProps, nextProps) => {
    // Only re-render if data has changed
    return (
      prevProps.data === nextProps.data &&
      prevProps.refreshing === nextProps.refreshing
    );
  }
);

export default MemoizedFlatList;