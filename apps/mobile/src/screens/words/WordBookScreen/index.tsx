import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  FlatList,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import Icon from '@/components/Icon';
import { LIBRARY_ICONS } from '@/constants/libraryConfig';
import WordDetailSheet from '@/components/WordDetailSheet';
import { createStyles, PICKER_ITEM_HEIGHT, PICKER_HEIGHT } from './styles';
import useWordBook, { type WordWithProgress } from './useWordBook';
import WordListItem from './WordListItem';
import FilterBar from './FilterBar';

// 页码选择器项组件（优化性能）
const PagePickerItem = React.memo(({ page, isSelected, themeColor, styles }: {
  page: number;
  isSelected: boolean;
  themeColor: string;
  styles: any;
}) => (
  <View style={styles.pagePickerItem}>
    <Text
      style={[
        styles.pagePickerItemText,
        isSelected && [styles.pagePickerItemTextSelected, { color: themeColor }],
      ]}
    >
      {page}
    </Text>
  </View>
));

export default function WordBookScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const navigation = useNavigation<any>();
  const styles = createStyles(theme);

  const {
    tag,
    themeColor,
    searchText,
    setSearchText,
    showSearch,
    activeFilter,
    setActiveFilter,
    words,
    isLoading,
    stats,
    selectedWord,
    showWordDetail,
    selectedLetter,
    letterCounts,
    currentLetterCount,
    currentPage,
    totalPages,
    showPagePicker,
    setShowPagePicker,
    pickerPage,
    pageNumbers,
    flatListRef,
    letterScrollRef,
    searchInputRef,
    pagePickerRef,
    handlePrevPage,
    handleNextPage,
    openPagePicker,
    handlePickerScrollEnd,
    submitPageJump,
    handleLetterPress,
    toggleSearch,
    closeWordDetail,
    selectWord,
    batchMode,
    selectedIds,
    toggleBatchMode,
    toggleSelectWord,
    handleBatchSkip,
    handleWordSkipped,
    AlertComponent,
  } = useWordBook();

  // 渲染单词项
  const renderWordItem = useCallback(({ item }: { item: WordWithProgress }) => (
    <WordListItem
      item={item}
      styles={styles}
      onPress={batchMode ? ((w: WordWithProgress) => toggleSelectWord(w.id)) : selectWord}
      batchMode={batchMode}
      isSelected={selectedIds.has(item.id)}
    />
  ), [styles, selectWord, batchMode, selectedIds, toggleSelectWord]);

  // 渲染页码项
  const renderPageItem = useCallback(({ item }: { item: number }) => (
    <PagePickerItem
      page={item}
      isSelected={item === pickerPage}
      themeColor={themeColor}
      styles={styles}
    />
  ), [pickerPage, themeColor, styles]);

  // 渲染分页控件
  const renderPagination = useCallback(() => {
    if (totalPages <= 1) return null;

    return (
      <View style={styles.pagination}>
        {/* 上一页按钮 */}
        <TouchableOpacity
          style={[
            styles.pageButton,
            currentPage === 1 && styles.pageButtonDisabled,
          ]}
          onPress={handlePrevPage}
          disabled={currentPage === 1}
        >
          <Icon
            name="chevron-left"
            size={24}
            color={currentPage === 1 ? theme.colors.text.disabled : themeColor}
          />
        </TouchableOpacity>

        {/* 页码信息（点击打开跳转） */}
        <TouchableOpacity style={styles.pageInfo} onPress={openPagePicker}>
          <Text style={[styles.pageNumber, { color: themeColor }]}>{currentPage}</Text>
          <Text style={styles.pageSeparator}>/</Text>
          <Text style={styles.pageTotal}>{totalPages}</Text>
        </TouchableOpacity>

        {/* 下一页按钮 */}
        <TouchableOpacity
          style={[
            styles.pageButton,
            currentPage === totalPages && styles.pageButtonDisabled,
          ]}
          onPress={handleNextPage}
          disabled={currentPage === totalPages}
        >
          <Icon
            name="chevron-right"
            size={24}
            color={currentPage === totalPages ? theme.colors.text.disabled : themeColor}
          />
        </TouchableOpacity>
      </View>
    );
  }, [totalPages, currentPage, handlePrevPage, handleNextPage, openPagePicker, styles, theme, themeColor]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 顶部导航 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>

        {/* 词库标题 */}
        <View style={styles.headerTitleContainer}>
          <Icon
            name={LIBRARY_ICONS[tag] || 'menu-book'}
            size={20}
            color={themeColor}
          />
          <Text style={[styles.headerTitle, { color: themeColor }]}>
            {tag}
          </Text>
        </View>

        {/* 搜索 + 批量操作按钮 */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            style={styles.searchButton}
            onPress={toggleSearch}
          >
            <Icon
              name={showSearch ? "close" : "search"}
              size={24}
              color={theme.colors.text.primary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.searchButton}
            onPress={toggleBatchMode}
          >
            <Icon
              name={batchMode ? "close" : "checklist"}
              size={24}
              color={batchMode ? theme.colors.primary : theme.colors.text.primary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* 搜索栏（可折叠） */}
      {showSearch && (
        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrapper}>
            <Icon name="search" size={20} color={theme.colors.text.disabled} />
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder={t('wordBook.searchPlaceholder')}
              placeholderTextColor={theme.colors.text.disabled}
              value={searchText}
              onChangeText={setSearchText}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <Icon name="close" size={18} color={theme.colors.text.disabled} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* 统计信息 */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: themeColor }]}>{stats.total}</Text>
          <Text style={styles.statLabel}>{t('wordBook.statTotal')}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.colors.warning }]}>{stats.learned}</Text>
          <Text style={styles.statLabel}>{t('wordBook.statLearning')}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.colors.success }]}>{stats.mastered}</Text>
          <Text style={styles.statLabel}>{t('wordBook.statMastered')}</Text>
        </View>
      </View>

      {/* 筛选栏（字母导航 + 字母信息 + 过滤标签） */}
      <FilterBar
        selectedLetter={selectedLetter}
        letterCounts={letterCounts}
        onLetterPress={handleLetterPress}
        letterScrollRef={letterScrollRef}
        themeColor={themeColor}
        currentLetterCount={currentLetterCount}
        searchText={searchText}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        styles={styles}
      />

      {/* 主体内容 */}
      <View style={styles.contentContainer}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={themeColor} />
          </View>
        ) : (
          <>
            <FlatList
              ref={flatListRef}
              data={words}
              keyExtractor={(item) => item.id}
              renderItem={renderWordItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Icon name="inbox" size={48} color={theme.colors.text.disabled} />
                  <Text style={styles.emptyText}>
                    {searchText ? t('wordBook.noSearchResult') : t('wordBook.noWords')}
                  </Text>
                </View>
              }
            />

            {/* 分页控件 */}
            {renderPagination()}
          </>
        )}
      </View>

      {/* 页码跳转底部弹窗 */}
      <Modal
        visible={showPagePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPagePicker(false)}
      >
        <View style={styles.pagePickerOverlay}>
          <TouchableOpacity
            style={styles.pagePickerDismissArea}
            activeOpacity={1}
            onPress={() => setShowPagePicker(false)}
          />
          <View style={styles.pagePickerContainer}>
            <View style={styles.pagePickerHeader}>
              <TouchableOpacity onPress={() => setShowPagePicker(false)}>
                <Text style={styles.pagePickerCancel}>{t('wordBook.cancel')}</Text>
              </TouchableOpacity>
              <Text style={styles.pagePickerTitle}>{t('wordBook.jumpToPage', { page: pickerPage })}</Text>
              <TouchableOpacity onPress={submitPageJump}>
                <Text style={[styles.pagePickerConfirm, { color: themeColor }]}>{t('wordBook.confirm')}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.pagePickerContent}>
              {/* 选中区域高亮 */}
              <View style={[styles.pagePickerHighlight, { borderColor: themeColor + '40' }]} />
              <FlatList
                ref={pagePickerRef}
                data={pageNumbers}
                keyExtractor={(item) => `page_${item}`}
                renderItem={renderPageItem}
                showsVerticalScrollIndicator={false}
                snapToInterval={PICKER_ITEM_HEIGHT}
                decelerationRate="fast"
                onMomentumScrollEnd={handlePickerScrollEnd}
                getItemLayout={(_, index) => ({
                  length: PICKER_ITEM_HEIGHT,
                  offset: PICKER_ITEM_HEIGHT * index,
                  index,
                })}
                contentContainerStyle={{
                  paddingVertical: PICKER_HEIGHT / 2 - PICKER_ITEM_HEIGHT / 2,
                }}
                style={styles.pagePickerList}
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={5}
                removeClippedSubviews
                extraData={pickerPage}
              />
              <Text style={styles.pagePickerTotalLabel}>{t('wordBook.totalPages', { total: totalPages })}</Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* 批量操作底部栏 */}
      {batchMode && (
        <View style={styles.batchBar}>
          <Text style={styles.batchBarText}>
            {t('wordBook.selectedCount', { count: selectedIds.size })}
          </Text>
          <TouchableOpacity
            style={[
              styles.batchBarButton,
              selectedIds.size === 0 && styles.batchBarButtonDisabled,
            ]}
            onPress={handleBatchSkip}
            disabled={selectedIds.size === 0}
            activeOpacity={0.8}
          >
            <Text style={styles.batchBarButtonText}>{t('wordBook.markMastered')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 单词详情底部抽屉 */}
      <WordDetailSheet
        visible={showWordDetail}
        word={selectedWord}
        progress={selectedWord?.progress}
        currentTag={tag}
        onClose={closeWordDetail}
        onSkipped={handleWordSkipped}
      />
      {AlertComponent}
    </SafeAreaView>
  );
}
