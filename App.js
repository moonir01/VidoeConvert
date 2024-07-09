import React, { useState } from 'react';
import { StyleSheet, Text, View, Button, FlatList, TouchableOpacity } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Video } from 'expo-av';

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

    console.log(result); // Log the result object

    if (!result.canceled && result.assets.length > 0) {
      setVideoFiles([...videoFiles, result.assets[0]]);
    }
  };

  const convertVideos = () => {
    // Implement video conversion logic here
    alert('Convert button pressed!');
  };

  const renderItem = ({ item }) => {
    if (!item) {
      return null; // Avoid rendering if item is undefined
    }

    // Extract the file name from the URI or use fileName if available
    const fileName = item.fileName || item.uri.split('/').pop() || 'Unknown File';

    return (
      <View style={styles.videoItem}>
        <Video
          source={{ uri: item.uri }}
          rate={1.0}
          volume={1.0}
          isMuted={true}
          resizeMode="cover"
          shouldPlay={false}
          style={styles.thumbnail}
        />
        <Text style={styles.fileName}>{decodeURI(fileName)}</Text>
      </View>
    );
  };

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
    padding: 5,
    borderBottomColor: '#ccc',
    borderBottomWidth: .7,
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnail: {
    width: 70,
    height: 70,
    marginRight: 3,
  },
  fileName: {
    fontSize: 16,
    marginLeft: 10, // Adjust margin as needed
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
