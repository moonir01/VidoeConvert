import React, { useState } from 'react';
import { StyleSheet, Text, View, Button, FlatList, TouchableOpacity } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export default function App() {
  const [videoFiles, setVideoFiles] = useState([]);

  const pickVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Sorry, we need media library permissions to make this work!');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
    });

    if (!result.canceled) {
      setVideoFiles([...videoFiles, result.uri]);
    }
  };

  const convertVideos = () => {
    // Implement video conversion logic here
    alert('Convert button pressed!');
  };

  const renderItem = ({ item }) => (
    <View style={styles.videoItem}>
      <Text>{item.split('/').pop()}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Video Converter App</Text>
      <Button title="Add Videos" onPress={pickVideo} />
      <FlatList
        data={videoFiles}
        renderItem={renderItem}
        keyExtractor={(item, index) => index.toString()}
        style={styles.list}
      />
      {videoFiles.length > 0 && (
        <TouchableOpacity style={styles.convertButton} onPress={convertVideos}>
          <Text style={styles.convertButtonText}>Convert</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  list: {
    flex: 1,
    width: '100%',
  },
  videoItem: {
    padding: 10,
    borderBottomColor: '#ccc',
    borderBottomWidth: 1,
  },
  convertButton: {
    backgroundColor: '#007BFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    width: '100%',
  },
  convertButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
