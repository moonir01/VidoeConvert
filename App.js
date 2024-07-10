import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, Dimensions, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Video } from 'expo-av';
import { MaterialIcons } from '@expo/vector-icons'; // Import MaterialIcons

const windowWidth = Dimensions.get('window').width;

export default function App() {
  const [videoFiles, setVideoFiles] = useState([]);
  const [isGridView, setIsGridView] = useState(false); // State to track layout type

  const pickVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Sorry, we need media library permissions to make this work!');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsMultipleSelection: true, // Enable multi-file selection
    });

    console.log(result); // Log the result object

    if (!result.canceled && result.assets.length > 0) {
      const newFiles = result.assets.filter(
        (newFile) => !videoFiles.some((existingFile) => existingFile.uri === newFile.uri)
      );

      if (newFiles.length < result.assets.length) {
        Alert.alert('Duplicate Files', 'Some files were already added.');
      }

      setVideoFiles([...videoFiles, ...newFiles]);
    }
  };

  const convertVideos = () => {
    // Implement video conversion logic here
    alert('Convert button pressed!');
  };

  const deleteVideo = (uri) => {
    setVideoFiles(videoFiles.filter((video) => video.uri !== uri));
  };

  const clearAllVideos = () => {
    setVideoFiles([]);
  };

  const toggleLayout = () => {
    setIsGridView(!isGridView);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Video Converter App</Text>
      <TouchableOpacity style={styles.addButton} onPress={pickVideo}>
        <Text style={styles.addButtonText}>Select or Browse Videos</Text>
      </TouchableOpacity>
      <View style={styles.headerContainer}>
        <Text style={styles.videoCount}>Total Videos: {videoFiles.length}</Text>
        {videoFiles.length > 0 && (
          <TouchableOpacity onPress={clearAllVideos} style={styles.clearButtonContainer}>
            <MaterialIcons name="clear" size={24} color="red" style={styles.clearIcon} />
            <Text style={styles.clearAllText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity style={styles.toggleLayoutButton} onPress={toggleLayout}>
        <MaterialIcons name={isGridView ? 'view-list' : 'view-module'} size={24} color="#fff" />
      </TouchableOpacity>
      {isGridView ? (
        <ScrollView contentContainerStyle={styles.gridContainer}>
          {videoFiles.map((item, index) => (
            <View key={index} style={styles.videoItemGrid}>
              <Video
                source={{ uri: item.uri }}
                rate={1.0}
                volume={1.0}
                isMuted={true}
                resizeMode="cover"
                shouldPlay={false}
                style={styles.thumbnailGrid}
              />
              <TouchableOpacity onPress={() => deleteVideo(item.uri)} style={styles.deleteButton}>
                <MaterialIcons name="delete" size={24} color="red" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.list}>
          {videoFiles.map((item, index) => (
            <View key={index} style={styles.videoItem}>
              <Video
                source={{ uri: item.uri }}
                rate={1.0}
                volume={1.0}
                isMuted={true}
                resizeMode="cover"
                shouldPlay={false}
                style={styles.thumbnail}
              />
              <Text style={styles.fileName}>{decodeURI(item.fileName || item.uri.split('/').pop() || 'Unknown File')}</Text>
              <TouchableOpacity onPress={() => deleteVideo(item.uri)} style={styles.deleteButton}>
                <MaterialIcons name="delete" size={24} color="red" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
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
    padding: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  addButton: {
    backgroundColor: '#007BFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
    elevation: 2, // Add elevation for Android
    shadowColor: '#000', // Add shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 10,
  },
  videoCount: {
    fontSize: 18,
  },
  clearButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearIcon: {
    marginRight: 5,
  },
  clearAllText: {
    fontSize: 16,
    color: 'red',
    textDecorationLine: 'underline',
  },
  toggleLayoutButton: {
    backgroundColor: '#007BFF',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    flex: 1,
    width: '100%',
  },
  videoItem: {
    padding: 5,
    borderBottomColor: '#ccc',
    borderBottomWidth: 0.7,
    flexDirection: 'row',
    alignItems: 'center',
  },
  videoItemGrid: {
    flexDirection: 'column',
    alignItems: 'center',
    margin: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 5,
  },
  thumbnail: {
    width: 70,
    height: 70,
    marginRight: 10,
  },
  thumbnailGrid: {
    width: 70,
    height: 70,
    marginBottom:10,
  },
  fileName: {
    fontSize: 16,
    marginLeft: 10,
    flex: 1,
  },
  deleteButton: {
    marginLeft: 10,
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
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 10,
    width: '100%',
  },
});
